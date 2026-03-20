import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOwnerContext, hoursSince } from '@/lib/owner-intelligence'

/**
 * Issue Detail + History API
 * 
 * GET /api/owner/issues/[id] — Issue detail with computed ageHours
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const issue = await prisma.ownerIssue.findUnique({
            where: { id: params.id },
            include: {
                location: { select: { id: true, name: true } },
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        })

        if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (issue.franchiseId !== ctx.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        return NextResponse.json({
            ...issue,
            ageHours: Math.round(hoursSince(issue.firstSeenAt) * 10) / 10,
        })
    } catch (error) {
        console.error('[OWNER_ISSUE_DETAIL]', error)
        return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
    }
}
