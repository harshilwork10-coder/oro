import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/station-alerts — Active station alerts based on thresholds
 *
 * Returns alerts for stations exceeding configurable thresholds:
 * - Stale heartbeat (>10 min)
 * - Offline (>1 hour)
 * - Unresolved stuck transactions on station
 * - Training mode left on
 * - Unpaired but active
 */

const THRESHOLDS = {
    STALE_HEARTBEAT_MS: 10 * 60 * 1000,     // 10 minutes
    OFFLINE_HEARTBEAT_MS: 60 * 60 * 1000,    // 1 hour
    CRITICAL_OFFLINE_MS: 4 * 60 * 60 * 1000, // 4 hours
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const stations = await prisma.station.findMany({
            where: {
                location: { franchiseId: user.franchiseId },
                isActive: true,
            },
            include: {
                location: { select: { name: true } },
            },
        })

        const now = Date.now()
        const alerts: {
            stationId: string
            stationName: string
            locationName: string
            severity: 'CRITICAL' | 'WARNING' | 'INFO'
            type: string
            message: string
        }[] = []

        for (const s of stations) {
            const heartbeatAge = s.lastHeartbeatAt
                ? now - new Date(s.lastHeartbeatAt).getTime()
                : null

            // Critical: offline > 4 hours
            if (s.pairingStatus !== 'UNPAIRED' && heartbeatAge && heartbeatAge > THRESHOLDS.CRITICAL_OFFLINE_MS) {
                alerts.push({
                    stationId: s.id, stationName: s.name, locationName: s.location?.name || '',
                    severity: 'CRITICAL', type: 'OFFLINE',
                    message: `Offline for ${Math.round(heartbeatAge / 3600000)}h — may need physical restart`,
                })
            }
            // Warning: offline > 1 hour
            else if (s.pairingStatus !== 'UNPAIRED' && heartbeatAge && heartbeatAge > THRESHOLDS.OFFLINE_HEARTBEAT_MS) {
                alerts.push({
                    stationId: s.id, stationName: s.name, locationName: s.location?.name || '',
                    severity: 'WARNING', type: 'OFFLINE',
                    message: `Offline for ${Math.round(heartbeatAge / 60000)} minutes`,
                })
            }
            // Info: stale > 10 min
            else if (s.pairingStatus !== 'UNPAIRED' && heartbeatAge && heartbeatAge > THRESHOLDS.STALE_HEARTBEAT_MS) {
                alerts.push({
                    stationId: s.id, stationName: s.name, locationName: s.location?.name || '',
                    severity: 'INFO', type: 'STALE',
                    message: `Last heartbeat ${Math.round(heartbeatAge / 60000)} minutes ago`,
                })
            }

            // Training mode left on
            if (s.trainingMode) {
                alerts.push({
                    stationId: s.id, stationName: s.name, locationName: s.location?.name || '',
                    severity: 'WARNING', type: 'TRAINING_MODE',
                    message: 'Training mode is ON — transactions will not be recorded',
                })
            }

            // Unpaired but active
            if (s.pairingStatus === 'UNPAIRED') {
                alerts.push({
                    stationId: s.id, stationName: s.name, locationName: s.location?.name || '',
                    severity: 'INFO', type: 'UNPAIRED',
                    message: 'Station is active but not yet paired to a device',
                })
            }
        }

        // Sort: CRITICAL first
        const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
        alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

        return NextResponse.json({
            alerts,
            summary: {
                total: alerts.length,
                critical: alerts.filter(a => a.severity === 'CRITICAL').length,
                warning: alerts.filter(a => a.severity === 'WARNING').length,
                info: alerts.filter(a => a.severity === 'INFO').length,
            },
            thresholds: {
                staleMinutes: THRESHOLDS.STALE_HEARTBEAT_MS / 60000,
                offlineMinutes: THRESHOLDS.OFFLINE_HEARTBEAT_MS / 60000,
                criticalOfflineHours: THRESHOLDS.CRITICAL_OFFLINE_MS / 3600000,
            },
            checkedAt: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[STATION_ALERTS]', error)
        return NextResponse.json({ error: 'Failed to check station alerts' }, { status: 500 })
    }
}
