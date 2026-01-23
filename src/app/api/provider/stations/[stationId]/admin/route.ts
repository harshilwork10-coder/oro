import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Provider Admin Tools for Station Management
 * 
 * Operations:
 * - Generate new pairing code (resets current pairing)
 * - Untrust/disable station (stolen device)
 * - Transfer station to new device
 */

// Generate random alphanumeric code
function generatePairingCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars (0/O, 1/I)
    let code = ''
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export async function POST(
    request: NextRequest,
    { params }: { params: { stationId: string } }
) {
    const session = await getServerSession(authOptions)

    // Only Provider can manage stations
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Provider access required' }, { status: 403 })
    }

    const { stationId } = params
    const body = await request.json()
    const { action } = body as { action: 'regenerate_code' | 'untrust' | 'transfer' }

    try {
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            include: { location: true }
        })

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 })
        }

        switch (action) {
            case 'regenerate_code': {
                // Generate new pairing code with 24-hour expiration
                const newCode = generatePairingCode()
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

                const updated = await prisma.station.update({
                    where: { id: stationId },
                    data: {
                        pairingCode: newCode,
                        pairingCodeExpiresAt: expiresAt,
                        pairingCodeUsedAt: null, // Reset - code can be used again
                        // Keep device paired unless explicitly untrusted
                    }
                })

                console.log(`[PROVIDER] Regenerated pairing code for station ${station.name}`)

                return NextResponse.json({
                    success: true,
                    pairingCode: newCode,
                    expiresAt: expiresAt.toISOString(),
                    message: `New pairing code: ${newCode} (expires in 24 hours)`
                })
            }

            case 'untrust': {
                // Revoke device trust - forces re-pairing
                await prisma.station.update({
                    where: { id: stationId },
                    data: {
                        isTrusted: false,
                        pairingStatus: 'UNPAIRED',
                        pairedDeviceId: null,
                        pairedAt: null,
                        pairingCodeUsedAt: null
                    }
                })

                // Also revoke all trusted devices for this station
                await prisma.trustedDevice.updateMany({
                    where: { stationId },
                    data: { status: 'REVOKED' }
                })

                console.log(`[PROVIDER] Untrusted station ${station.name} - device must re-pair`)

                return NextResponse.json({
                    success: true,
                    message: 'Station untrusted. Device must re-pair with a new code.'
                })
            }

            case 'transfer': {
                // Clear device binding to allow transfer to new device
                const newCode = generatePairingCode()
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

                await prisma.station.update({
                    where: { id: stationId },
                    data: {
                        isTrusted: false,
                        pairingStatus: 'UNPAIRED',
                        pairedDeviceId: null,
                        pairedAt: null,
                        pairingCode: newCode,
                        pairingCodeExpiresAt: expiresAt,
                        pairingCodeUsedAt: null
                    }
                })

                // Revoke old trusted device
                await prisma.trustedDevice.updateMany({
                    where: { stationId },
                    data: { status: 'REVOKED' }
                })

                console.log(`[PROVIDER] Prepared station ${station.name} for transfer to new device`)

                return NextResponse.json({
                    success: true,
                    pairingCode: newCode,
                    expiresAt: expiresAt.toISOString(),
                    message: `Station ready for transfer. New code: ${newCode}`
                })
            }

            default:
                return NextResponse.json({
                    error: 'Invalid action. Use: regenerate_code, untrust, or transfer'
                }, { status: 400 })
        }

    } catch (error) {
        console.error('[PROVIDER] Station admin error:', error)
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    }
}
