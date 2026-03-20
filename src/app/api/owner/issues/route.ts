import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOwnerContext } from '@/lib/owner-intelligence'

/**
 * Owner Issues API — Central issue queue
 * 
 * GET — List issues with filtering/sorting
 */
export async function GET(request: NextRequest) {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')             // OPEN,ACKNOWLEDGED,...
        const severity = searchParams.get('severity')         // LOW,MEDIUM,HIGH,CRITICAL
        const locationId = searchParams.get('locationId')
        const category = searchParams.get('category')
        const assignedToId = searchParams.get('assignedToId')
        const sortBy = searchParams.get('sortBy') || 'priorityScore'
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: any = { franchiseId: ctx.franchiseId }

        if (status) {
            const statuses = status.split(',')
            where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
        }
        if (severity) where.severity = severity
        if (locationId) where.locationId = locationId
        if (category) where.category = category
        if (assignedToId) where.assignedToId = assignedToId

        const orderBy: any =
            sortBy === 'newest' ? { createdAt: 'desc' } :
                sortBy === 'oldest' ? { firstSeenAt: 'asc' } :
                    sortBy === 'severity' ? [{ severity: 'desc' }, { priorityScore: 'desc' }] :
                        { priorityScore: 'desc' }

        const [issues, total] = await Promise.all([
            prisma.ownerIssue.findMany({
                where,
                orderBy,
                take: limit,
                include: {
                    location: { select: { id: true, name: true } },
                },
            }),
            prisma.ownerIssue.count({ where }),
        ])

        // Compute ageHours on read (never stored)
        const enriched = issues.map(issue => ({
            ...issue,
            ageHours: Math.round((Date.now() - issue.firstSeenAt.getTime()) / (1000 * 60 * 60) * 10) / 10,
            financialImpact: issue.financialImpact,
        }))

        // Get location list for filter dropdown
        const locations = await prisma.location.findMany({
            where: { franchiseId: ctx.franchiseId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ issues: enriched, total, locations })
    } catch (error) {
        console.error('[OWNER_ISSUES_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }
}
