import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET - Refresh terminal config by station ID
 * 
 * Called on POS load to ensure terminal_config is always current.
 * This ensures store name, settings, etc. are always up-to-date
 * even if Provider changes them on the server.
 */
export async function GET(request: NextRequest) {
    const stationId = request.nextUrl.searchParams.get('stationId')

    if (!stationId) {
        return NextResponse.json({ error: 'stationId is required' }, { status: 400 })
    }

    try {
        const station = await prisma.station.findUnique({
            where: { id: stationId },
            include: {
                location: {
                    include: {
                        franchise: {
                            select: {
                                id: true,
                                name: true,
                                industryType: true,
                                logo: true
                            }
                        }
                    }
                },
                dedicatedTerminal: {
                    select: {
                        id: true,
                        name: true,
                        terminalIP: true,
                        terminalPort: true,
                        terminalType: true
                    }
                }
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 })
        }

        const location = station.location
        const franchise = location.franchise

        // Return fresh terminal config matching the format stored in localStorage
        return NextResponse.json({
            success: true,
            config: {
                business: {
                    id: franchise.id,
                    name: franchise.name,
                    industryType: franchise.industryType,
                    logo: franchise.logo
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
            }
        })

    } catch (error) {
        console.error('[REFRESH_CONFIG] Error:', error)
        return NextResponse.json({ error: 'Failed to refresh config' }, { status: 500 })
    }
}
