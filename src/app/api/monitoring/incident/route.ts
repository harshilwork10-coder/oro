import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * S8-12: Production Monitoring & Operational Alerts
 *
 * POST /api/monitoring/incident — Log an operational incident
 * GET  /api/monitoring/incident — List recent incidents + health summary
 *
 * Types: PAYMENT_FAILURE, PRINTER_FAILURE, SCALE_DISCONNECT,
 *        APPROVAL_QUEUE_FAILURE, API_ERROR, TERMINAL_OFFLINE
 */

const INCIDENT_TYPES = [
    'PAYMENT_FAILURE', 'PRINTER_FAILURE', 'SCALE_DISCONNECT',
    'APPROVAL_QUEUE_FAILURE', 'API_ERROR', 'TERMINAL_OFFLINE',
    'DATABASE_ERROR', 'AUTH_FAILURE', 'SYNC_FAILURE'
] as const

type IncidentType = typeof INCIDENT_TYPES[number]

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { type, severity, message, stationId, metadata } = body as {
            type: IncidentType
            severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
            message: string
            stationId?: string
            metadata?: Record<string, any>
        }

        if (!type || !INCIDENT_TYPES.includes(type)) {
            return NextResponse.json({ error: `type required: ${INCIDENT_TYPES.join(', ')}` }, { status: 400 })
        }
        if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'OPS_INCIDENT', entityType: 'Incident', entityId: `INC-${Date.now()}`,
            details: {
                type, severity: severity || 'MEDIUM',
                message, stationId, metadata,
                reportedAt: new Date().toISOString()
            }
        })

        return NextResponse.json({
            logged: true, type, severity: severity || 'MEDIUM',
            message: 'Incident recorded'
        }, { status: 201 })
    } catch (error: any) {
        console.error('[MONITORING_POST]', error)
        return NextResponse.json({ error: 'Failed to log incident' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Manager+ only
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const hours = parseInt(searchParams.get('hours') || '24')

    try {
        const since = new Date(Date.now() - hours * 3600000)

        const incidents = await prisma.auditLog.findMany({
            where: {
                franchiseId: user.franchiseId,
                action: 'OPS_INCIDENT',
                createdAt: { gte: since }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        })

        const parsed = incidents.map(i => {
            const data = i.changes ? JSON.parse(i.changes) : {}
            return {
                id: i.id,
                type: data.type, severity: data.severity,
                message: data.message, stationId: data.stationId,
                reporter: i.userEmail,
                reportedAt: data.reportedAt || i.createdAt
            }
        })

        // Health summary
        const byType = new Map<string, number>()
        const bySeverity = new Map<string, number>()
        for (const inc of parsed) {
            byType.set(inc.type, (byType.get(inc.type) || 0) + 1)
            bySeverity.set(inc.severity, (bySeverity.get(inc.severity) || 0) + 1)
        }

        const criticalCount = bySeverity.get('CRITICAL') || 0
        const highCount = bySeverity.get('HIGH') || 0
        const healthScore = parsed.length === 0 ? 100
            : criticalCount > 0 ? 20
                : highCount > 3 ? 50
                    : parsed.length > 10 ? 70 : 90

        return NextResponse.json({
            incidents: parsed,
            summary: {
                total: parsed.length,
                byType: Object.fromEntries(byType),
                bySeverity: Object.fromEntries(bySeverity),
                healthScore,
                healthStatus: healthScore >= 90 ? 'HEALTHY' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL',
                period: `${hours}h`
            }
        })
    } catch (error: any) {
        console.error('[MONITORING_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
