import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/pos/telemetry — Ingest POS operational telemetry events
 *
 * Events are batched from the POS client and stored for observability.
 * Used for: performance monitoring, error tracking, flow completion rates,
 * scale/payment/recovery health.
 *
 * Body: { events: TelemetryEvent[] }
 */
interface TelemetryEvent {
    event: string          // e.g., 'SALE_COMPLETE', 'CARD_TIMEOUT', 'SCALE_CONNECT', 'RECOVERY_VOID'
    durationMs?: number    // How long the operation took
    success: boolean
    stationId?: string
    metadata?: Record<string, any>
    timestamp?: string     // ISO timestamp from client
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const events: TelemetryEvent[] = body.events || [body]

        if (!events.length) {
            return NextResponse.json({ error: 'No events provided' }, { status: 400 })
        }

        // Store telemetry as audit log entries with telemetry category
        const inserts = events.slice(0, 50).map(evt => ({
            userId: user.id,
            userEmail: user.email || 'unknown',
            userRole: user.role || 'unknown',
            action: `TELEMETRY_${evt.event}`,
            entityType: 'Telemetry',
            entityId: evt.stationId || 'global',
            changes: JSON.stringify({
                event: evt.event,
                success: evt.success,
                durationMs: evt.durationMs || null,
                stationId: evt.stationId || null,
                metadata: evt.metadata || {},
                franchiseId: user.franchiseId,
                clientTimestamp: evt.timestamp || new Date().toISOString(),
                serverTimestamp: new Date().toISOString(),
            }),
            status: evt.success ? 'SUCCESS' : 'FAILURE',
        }))

        await prisma.auditLog.createMany({ data: inserts })

        return NextResponse.json({
            accepted: inserts.length,
            dropped: Math.max(0, events.length - 50),
        })
    } catch (error: any) {
        console.error('[TELEMETRY]', error)
        return NextResponse.json({ error: 'Telemetry ingestion failed' }, { status: 500 })
    }
}

/**
 * GET /api/pos/telemetry — Query telemetry summary (owner/admin only)
 *
 * Returns aggregated counts of recent telemetry events.
 * Query params: ?hours=24&stationId=xxx
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const hours = parseInt(searchParams.get('hours') || '24')
        const stationId = searchParams.get('stationId')

        const since = new Date(Date.now() - hours * 60 * 60 * 1000)

        const where: any = {
            action: { startsWith: 'TELEMETRY_' },
            createdAt: { gte: since },
            changes: { contains: user.franchiseId },
        }
        if (stationId) {
            where.entityId = stationId
        }

        const events = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 500,
            select: {
                action: true,
                status: true,
                changes: true,
                createdAt: true,
                entityId: true,
            },
        })

        // Aggregate by event type
        const summary: Record<string, { total: number; success: number; failure: number; avgDurationMs: number }> = {}
        for (const evt of events) {
            const eventName = evt.action.replace('TELEMETRY_', '')
            if (!summary[eventName]) {
                summary[eventName] = { total: 0, success: 0, failure: 0, avgDurationMs: 0 }
            }
            summary[eventName].total++
            if (evt.status === 'SUCCESS') summary[eventName].success++
            else summary[eventName].failure++

            if (evt.changes) {
                try {
                    const data = JSON.parse(evt.changes)
                    if (data.durationMs) {
                        summary[eventName].avgDurationMs =
                            (summary[eventName].avgDurationMs * (summary[eventName].total - 1) + data.durationMs) / summary[eventName].total
                    }
                } catch {}
            }
        }

        return NextResponse.json({
            period: `${hours}h`,
            totalEvents: events.length,
            summary,
            stations: [...new Set(events.map(e => e.entityId))],
        })
    } catch (error: any) {
        console.error('[TELEMETRY_GET]', error)
        return NextResponse.json({ error: 'Failed to query telemetry' }, { status: 500 })
    }
}
