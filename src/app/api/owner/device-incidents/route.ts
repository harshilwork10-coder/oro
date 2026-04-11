import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/device-incidents — Device incident timeline
 *
 * Returns a chronological timeline of device-related events:
 * pairing, heartbeat gaps, offline periods, scale disconnects,
 * payment timeouts, recovery actions.
 *
 * Query: ?stationId=xxx&hours=24
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const stationId = searchParams.get('stationId')
        const hours = parseInt(searchParams.get('hours') || '24')
        const since = new Date(Date.now() - hours * 60 * 60 * 1000)

        // Fetch device-related audit events
        const deviceActions = [
            'TELEMETRY_SCALE_CONNECT', 'TELEMETRY_SCALE_DISCONNECT',
            'TELEMETRY_CARD_TIMEOUT', 'TELEMETRY_PAYMENT_ERROR',
            'TELEMETRY_RECOVERY_VOID', 'TELEMETRY_RECOVERY_RESUME',
            'TELEMETRY_DRAWER_OPEN', 'TELEMETRY_DRAWER_ERROR',
            'TELEMETRY_PRINT_ERROR', 'TELEMETRY_DISPLAY_CONNECT',
            'TELEMETRY_DISPLAY_DISCONNECT',
            'POS_AUTH_FAILURE', 'PILOT_ISSUE_CREATED',
        ]

        const where: any = {
            createdAt: { gte: since },
            changes: { contains: user.franchiseId },
            OR: [
                { action: { in: deviceActions } },
                { action: { startsWith: 'TELEMETRY_' }, status: 'FAILURE' },
            ],
        }
        if (stationId) {
            where.entityId = stationId
        }

        const events = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                action: true,
                status: true,
                entityId: true,
                userEmail: true,
                changes: true,
                createdAt: true,
            },
        })

        const timeline = events.map(e => {
            const data = e.changes ? (() => { try { return JSON.parse(e.changes) } catch { return {} } })() : {}
            return {
                id: e.id,
                event: e.action.replace('TELEMETRY_', ''),
                stationId: e.entityId,
                severity: e.status === 'FAILURE' ? 'ERROR' : 'INFO',
                user: e.userEmail,
                metadata: data.metadata || data,
                timestamp: e.createdAt.toISOString(),
            }
        })

        // Group by station
        const byStation: Record<string, typeof timeline> = {}
        for (const evt of timeline) {
            const sid = evt.stationId || 'global'
            if (!byStation[sid]) byStation[sid] = []
            byStation[sid].push(evt)
        }

        return NextResponse.json({
            timeline,
            byStation,
            totalEvents: timeline.length,
            period: `${hours}h`,
        })
    } catch (error: any) {
        console.error('[DEVICE_INCIDENTS]', error)
        return NextResponse.json({ error: 'Failed to fetch device incidents' }, { status: 500 })
    }
}
