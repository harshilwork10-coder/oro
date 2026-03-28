import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/pilot-issues — Pilot issue dashboard
 *
 * Aggregates recent errors, stuck transactions, stale stations, and telemetry
 * anomalies into a single owner-facing issue feed for pilot monitoring.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const hours = parseInt(searchParams.get('hours') || '24')
        const since = new Date(Date.now() - hours * 60 * 60 * 1000)

        const issues: { severity: 'CRITICAL' | 'WARNING' | 'INFO'; category: string; message: string; timestamp: Date; details?: any }[] = []

        // 1. Stuck/pending transactions
        const stuckTx = await prisma.transaction.count({
            where: {
                franchiseId: user.franchiseId,
                status: { in: ['PENDING', 'IN_PROGRESS', 'SUSPENDED'] },
                createdAt: { gte: since },
            },
        })
        if (stuckTx > 0) {
            issues.push({
                severity: stuckTx > 5 ? 'CRITICAL' : 'WARNING',
                category: 'TRANSACTIONS',
                message: `${stuckTx} stuck/pending transaction${stuckTx > 1 ? 's' : ''} in last ${hours}h`,
                timestamp: new Date(),
                details: { count: stuckTx, statuses: ['PENDING', 'IN_PROGRESS', 'SUSPENDED'] },
            })
        }

        // 2. Stale/offline stations
        const stations = await prisma.station.findMany({
            where: { location: { franchiseId: user.franchiseId }, isActive: true },
            select: { id: true, name: true, lastHeartbeatAt: true, pairingStatus: true },
        })
        const STALE_MS = 10 * 60 * 1000
        const staleStations = stations.filter(s => {
            if (s.pairingStatus === 'UNPAIRED') return false
            if (!s.lastHeartbeatAt) return true
            return Date.now() - new Date(s.lastHeartbeatAt).getTime() > STALE_MS
        })
        if (staleStations.length > 0) {
            issues.push({
                severity: staleStations.length >= stations.length ? 'CRITICAL' : 'WARNING',
                category: 'STATIONS',
                message: `${staleStations.length} station${staleStations.length > 1 ? 's' : ''} stale/offline`,
                timestamp: new Date(),
                details: { stations: staleStations.map(s => ({ id: s.id, name: s.name })) },
            })
        }

        // 3. Recent failed telemetry events
        const failedEvents = await prisma.auditLog.count({
            where: {
                action: { startsWith: 'TELEMETRY_' },
                status: 'FAILURE',
                createdAt: { gte: since },
                changes: { contains: user.franchiseId },
            },
        })
        if (failedEvents > 0) {
            issues.push({
                severity: failedEvents > 20 ? 'CRITICAL' : failedEvents > 5 ? 'WARNING' : 'INFO',
                category: 'TELEMETRY',
                message: `${failedEvents} failed POS operation${failedEvents > 1 ? 's' : ''} logged in last ${hours}h`,
                timestamp: new Date(),
                details: { count: failedEvents },
            })
        }

        // 4. Voided transactions (potential issue pattern)
        const voidedTx = await prisma.transaction.count({
            where: {
                franchiseId: user.franchiseId,
                status: 'VOIDED',
                createdAt: { gte: since },
            },
        })
        if (voidedTx > 3) {
            issues.push({
                severity: voidedTx > 10 ? 'WARNING' : 'INFO',
                category: 'TRANSACTIONS',
                message: `${voidedTx} voided transaction${voidedTx > 1 ? 's' : ''} in last ${hours}h — review for patterns`,
                timestamp: new Date(),
                details: { count: voidedTx },
            })
        }

        // Sort by severity
        const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
        issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

        return NextResponse.json({
            issues,
            summary: {
                total: issues.length,
                critical: issues.filter(i => i.severity === 'CRITICAL').length,
                warning: issues.filter(i => i.severity === 'WARNING').length,
                info: issues.filter(i => i.severity === 'INFO').length,
            },
            period: `${hours}h`,
            checkedAt: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[PILOT_ISSUES]', error)
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }
}
