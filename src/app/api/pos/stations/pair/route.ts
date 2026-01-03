import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Pair a device to a station using pairing code
export async function POST(request: NextRequest) {
    try {
        const { pairingCode, locationId } = await request.json()

        if (!pairingCode) {
            return NextResponse.json({ error: 'Pairing code required' }, { status: 400 })
        }

        // Find station by pairing code
        const station = await prisma.station.findFirst({
            where: {
                pairingCode: pairingCode.toUpperCase(),
                isActive: true,
                ...(locationId && { locationId })
            },
            include: {
                dedicatedTerminal: true,
                location: true
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Invalid pairing code' }, { status: 404 })
        }

        // Return station info for device to store
        return NextResponse.json({
            success: true,
            station: {
                id: station.id,
                name: station.name,
                paymentMode: station.paymentMode,
                pairingCode: station.pairingCode,
                locationName: station.location.name,
                location: {
                    id: station.location.id,
                    name: station.location.name
                },
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
        console.error('Station pairing error:', error)
        return NextResponse.json({ error: 'Pairing failed' }, { status: 500 })
    }
}

// GET - Verify a station ID is still valid (for already-paired devices)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
        return NextResponse.json({ error: 'Station ID required' }, { status: 400 })
    }

    const station = await prisma.station.findUnique({
        where: { id: stationId },
        include: {
            dedicatedTerminal: true,
            location: true
        }
    })

    if (!station || !station.isActive) {
        return NextResponse.json({ error: 'Station not found or inactive' }, { status: 404 })
    }

    return NextResponse.json({
        station: {
            id: station.id,
            name: station.name,
            paymentMode: station.paymentMode,
            pairingCode: station.pairingCode,
            locationName: station.location.name,
            location: {
                id: station.location.id,
                name: station.location.name
            },
            dedicatedTerminal: station.dedicatedTerminal ? {
                id: station.dedicatedTerminal.id,
                name: station.dedicatedTerminal.name,
                terminalIP: station.dedicatedTerminal.terminalIP,
                terminalPort: station.dedicatedTerminal.terminalPort,
                terminalType: station.dedicatedTerminal.terminalType
            } : null
        }
    })
}

