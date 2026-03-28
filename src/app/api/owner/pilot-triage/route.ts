import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Pilot Bug Triage Board
 * 
 * GET  — List pilot issues with severity/status
 * POST — Submit new pilot issue
 * 
 * Leverages AuditLog for storage with PILOT_ISSUE prefix.
 */

interface PilotIssue {
    id: string
    severity: 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
    title: string
    description: string
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX'
    reportedBy: string
    stationId?: string
    createdAt: string
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const statusFilter = searchParams.get('status') || 'OPEN,IN_PROGRESS'
        const severityFilter = searchParams.get('severity')

        const issues = await prisma.auditLog.findMany({
            where: {
                action: { startsWith: 'PILOT_ISSUE' },
                changes: { contains: user.franchiseId },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        })

        let parsed: PilotIssue[] = issues.map(i => {
            const data = i.changes ? JSON.parse(i.changes) : {}
            return {
                id: i.id,
                severity: data.severity || 'MEDIUM',
                category: data.category || 'GENERAL',
                title: data.title || i.entityId || 'Untitled',
                description: data.description || '',
                status: data.status || 'OPEN',
                reportedBy: i.userEmail,
                stationId: data.stationId || null,
                createdAt: i.createdAt.toISOString(),
            }
        })

        // Filter
        const statuses = statusFilter.split(',')
        parsed = parsed.filter(i => statuses.includes(i.status))
        if (severityFilter) {
            const sevs = severityFilter.split(',')
            parsed = parsed.filter(i => sevs.includes(i.severity))
        }

        // Sort: BLOCKER first
        const sevOrder: Record<string, number> = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        parsed.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))

        const summary = {
            total: parsed.length,
            blocker: parsed.filter(i => i.severity === 'BLOCKER').length,
            high: parsed.filter(i => i.severity === 'HIGH').length,
            medium: parsed.filter(i => i.severity === 'MEDIUM').length,
            low: parsed.filter(i => i.severity === 'LOW').length,
        }

        return NextResponse.json({ issues: parsed, summary })
    } catch (error: any) {
        console.error('[PILOT_TRIAGE]', error)
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { severity, category, title, description, stationId } = body

        if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
        if (!['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'].includes(severity)) {
            return NextResponse.json({ error: 'severity must be BLOCKER, HIGH, MEDIUM, or LOW' }, { status: 400 })
        }

        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'PILOT_ISSUE_CREATED',
            entityType: 'PilotIssue',
            entityId: title.substring(0, 50),
            details: {
                severity,
                category: category || 'GENERAL',
                title,
                description: description || '',
                stationId: stationId || null,
                status: 'OPEN',
                franchiseId: user.franchiseId,
            },
        })

        return NextResponse.json({ success: true, message: 'Issue logged' })
    } catch (error: any) {
        console.error('[PILOT_TRIAGE_POST]', error)
        return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
    }
}
