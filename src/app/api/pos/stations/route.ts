import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get stations for current user's location (with terminal info)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Get locationId - could be on user directly or need to look it up
        let locationId = user.locationId

        // If no direct locationId, try to get from user's franchise default location
        if (!locationId && user.id) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    location: true,
                    franchise: {
                        include: {
                            locations: { take: 1 }
                        }
                    }
                }
            })
            locationId = userData?.locationId || userData?.franchise?.locations?.[0]?.id
        }

        if (!locationId) {
            return NextResponse.json({ error: 'No location assigned', stations: [] }, { status: 200 })
        }

        const stations = await prisma.station.findMany({
            where: {
                locationId: locationId,
                isActive: true
            },
            include: {
                dedicatedTerminal: true,
                location: true
            },
            orderBy: { name: 'asc' }
        })

        // Map to expected format
        const formattedStations = stations.map(s => ({
            id: s.id,
            name: s.name,
            paymentMode: s.paymentMode,
            pairingCode: s.pairingCode,
            locationName: s.location?.name || 'Unknown',
            dedicatedTerminal: s.dedicatedTerminal ? {
                id: s.dedicatedTerminal.id,
                name: s.dedicatedTerminal.name,
                terminalIP: s.dedicatedTerminal.terminalIP,
                terminalPort: s.dedicatedTerminal.terminalPort
            } : null
        }))

        return NextResponse.json({ stations: formattedStations })
    } catch (error) {
        console.error('[STATIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
    }
}

// POST - Create a new station (manager/owner only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized to create stations' }, { status: 403 })
        }

        const body = await request.json()
        const { locationId, name } = body

        if (!locationId || !name) {
            return NextResponse.json({ error: 'Location ID and name required' }, { status: 400 })
        }

        const station = await prisma.station.create({
            data: {
                locationId,
                name
            }
        })

        return NextResponse.json({ station })
    } catch (error) {
        console.error('[STATIONS_POST]', error)
        return NextResponse.json({ error: 'Failed to create station' }, { status: 500 })
    }
}
