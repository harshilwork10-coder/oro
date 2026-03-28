import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/station-health — Station/device health overview
 *
 * Returns all stations with pairing status, heartbeat health, and recent activity.
 * Owner/Manager only.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        // Get all stations for this franchise
        const stations = await prisma.station.findMany({
            where: {
                location: { franchiseId: user.franchiseId },
                ...(locationId ? { locationId } : {}),
            },
            include: {
                location: { select: { id: true, name: true } },
                dedicatedTerminal: { select: { id: true, name: true, status: true } },
                displayProfile: { select: { displayMode: true, isAutoDetected: true } },
            },
            orderBy: { name: 'asc' },
        })

        const now = new Date()
        const STALE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

        const stationHealth = stations.map(s => {
            const lastHeartbeat = s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt) : null
            const heartbeatAgeMs = lastHeartbeat ? now.getTime() - lastHeartbeat.getTime() : null
            const isOnline = heartbeatAgeMs !== null && heartbeatAgeMs < STALE_THRESHOLD_MS
            const isStale = heartbeatAgeMs !== null && heartbeatAgeMs >= STALE_THRESHOLD_MS && heartbeatAgeMs < 24 * 60 * 60 * 1000

            let healthStatus: 'ONLINE' | 'STALE' | 'OFFLINE' | 'UNPAIRED'
            if (s.pairingStatus === 'UNPAIRED') healthStatus = 'UNPAIRED'
            else if (isOnline) healthStatus = 'ONLINE'
            else if (isStale) healthStatus = 'STALE'
            else healthStatus = 'OFFLINE'

            return {
                id: s.id,
                name: s.name,
                locationId: s.locationId,
                locationName: s.location?.name,
                isActive: s.isActive,
                trainingMode: s.trainingMode,
                pairingStatus: s.pairingStatus,
                pairedAt: s.pairedAt,
                isTrusted: s.isTrusted,
                lastHeartbeat: s.lastHeartbeatAt,
                heartbeatAgeMs,
                healthStatus,
                paymentMode: s.paymentMode,
                terminal: s.dedicatedTerminal ? {
                    id: s.dedicatedTerminal.id,
                    name: s.dedicatedTerminal.name,
                    status: s.dedicatedTerminal.status,
                } : null,
                display: s.displayProfile ? {
                    mode: s.displayProfile.displayMode,
                    autoDetected: s.displayProfile.isAutoDetected,
                } : null,
                currentUserId: s.currentUserId,
            }
        })

        // Summary counts
        const summary = {
            total: stationHealth.length,
            online: stationHealth.filter(s => s.healthStatus === 'ONLINE').length,
            stale: stationHealth.filter(s => s.healthStatus === 'STALE').length,
            offline: stationHealth.filter(s => s.healthStatus === 'OFFLINE').length,
            unpaired: stationHealth.filter(s => s.healthStatus === 'UNPAIRED').length,
            trainingMode: stationHealth.filter(s => s.trainingMode).length,
        }

        return NextResponse.json({ stations: stationHealth, summary })
    } catch (error: any) {
        console.error('[STATION_HEALTH]', error)
        return NextResponse.json({ error: 'Failed to fetch station health' }, { status: 500 })
    }
}
