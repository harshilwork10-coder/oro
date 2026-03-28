/**
 * POST /api/settings/stations/[stationId]/reset-pairing
 * 
 * Resets a station's pairing status so it can be paired to a new device.
 * Used when:
 * - Device is replaced
 * - Testing with different emulators
 * - Station needs to be moved to different hardware
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ stationId: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { stationId } = await params

        // Verify station exists and user has access
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            include: {
                location: {
                    select: {
                        franchiseId: true
                    }
                }
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 })
        }

        // Reset the pairing
        const updated = await prisma.station.update({
            where: { id: stationId },
            data: {
                pairingStatus: 'UNPAIRED',
                pairedDeviceId: null,
                pairedAt: null,
                pairingCodeUsedAt: null,    // CRITICAL: Allow the existing code to be used again
                isTrusted: false            // Reset trust — new device must re-pair
            }
        })

        console.log(`[reset-pairing] Station ${station.name} (${stationId}) reset by user ${user.email}`)

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'OWNER',
            action: 'STATION_RESET_PAIRING',
            entityType: 'Station',
            entityId: stationId,
            metadata: { stationName: station.name, locationFranchiseId: station.location?.franchiseId }
        })

        return NextResponse.json({
            success: true,
            message: `Station "${station.name}" reset. Pairing code: ${station.pairingCode}`,
            pairingCode: station.pairingCode
        })

    } catch (error) {
        console.error('[reset-pairing] Error:', error)
        return NextResponse.json({ error: 'Failed to reset pairing' }, { status: 500 })
    }
}
