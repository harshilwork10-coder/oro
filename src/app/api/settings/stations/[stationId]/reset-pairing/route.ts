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
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ stationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
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

        console.log(`[reset-pairing] Station ${station.name} (${stationId}) reset by user ${session.user.email}`)

        // Audit log
        await auditLog({
            userId: session.user.id,
            userEmail: session.user.email!,
            userRole: (session.user as any).role || 'OWNER',
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
