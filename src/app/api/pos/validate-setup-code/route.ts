import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Validate station pairing code and return business/location/station info
// Simplified: Only uses Station.pairingCode (no more Location.setupCode)
export async function POST(request: NextRequest) {
    try {
        const { code, deviceId, meta } = await request.json()

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Station code is required' }, { status: 400 })
        }

        const cleanCode = code.toUpperCase().trim()
        // Station code validation

        // Find station by pairing code
        const station = await prisma.station.findFirst({
            where: {
                pairingCode: cleanCode,
                isActive: true
            },
            include: {
                location: {
                    include: {
                        franchise: {
                            select: {
                                id: true,
                                settings: {
                                    select: {
                                        storeLogo: true
                                    }
                                },
                                franchisor: {
                                    select: {
                                        id: true,
                                        name: true,
                                        industryType: true
                                    }
                                }
                            }
                        }
                    }
                },
                dedicatedTerminal: true
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Invalid station code' }, { status: 400 })
        }

        // COCKROACH PERSISTENCE: Register the trusted device if provided
        if (deviceId) {
            // Check if exists to avoid unique constraint error (upsert logic)
            // But deviceId is unique. If it exists, it might be for a different station (re-pairing) or same (refresh).
            // We upsert by deviceId.
            await prisma.trustedDevice.upsert({
                where: { deviceId },
                update: {
                    stationId: station.id, // Update station link if moved
                    status: 'ACTIVE',
                    lastSeenAt: new Date(),
                    userAgent: meta?.userAgent || undefined
                },
                create: {
                    deviceId,
                    stationId: station.id,
                    name: meta?.deviceName || "POS Register",
                    userAgent: meta?.userAgent || undefined,
                    status: 'ACTIVE'
                }
            })
        }

        const location = station.location
        const franchisor = location.franchise?.franchisor

        return NextResponse.json({
            success: true,
            business: {
                id: franchisor?.id || location.franchiseId,
                name: franchisor?.name || 'Business',
                industryType: franchisor?.industryType || 'RETAIL',
                logo: location.franchise?.settings?.storeLogo || null
            },
            location: {
                id: location.id,
                name: location.name
            },
            station: {
                id: station.id,
                name: station.name,
                pairingCode: station.pairingCode,
                paymentMode: station.paymentMode,
                dedicatedTerminal: station.dedicatedTerminal ? {
                    id: station.dedicatedTerminal.id,
                    name: station.dedicatedTerminal.name,
                    terminalIP: station.dedicatedTerminal.terminalIP,
                    terminalPort: station.dedicatedTerminal.terminalPort,
                    terminalType: station.dedicatedTerminal.terminalType
                } : null
            }
        })

    } catch (error) {
        console.error('Station code validation error:', error)
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
    }
}
