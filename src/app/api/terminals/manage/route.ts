import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET — list all payment terminals grouped by location
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all locations with their PaymentTerminal records + stations
        const locations = await prisma.location.findMany({
            include: {
                franchise: {
                    select: {
                        name: true,
                        franchisorId: true,
                        franchisor: { select: { id: true, name: true } }
                    }
                },
                paymentTerminals: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        assignedStation: {
                            select: { id: true, name: true }
                        }
                    }
                },
                stations: {
                    select: { id: true, name: true, isActive: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        const result = locations
            .filter(loc => loc.franchise?.franchisorId && loc.franchise?.franchisor)
            .map(loc => ({
                locationId: loc.id,
                locationName: loc.name,
                franchiseName: loc.franchise.name,
                legacyIP: loc.paxTerminalIP,
                legacyPort: loc.paxTerminalPort,
                legacyMID: loc.processorMID,
                terminals: loc.paymentTerminals.map(t => ({
                    id: t.id,
                    name: t.name,
                    terminalType: t.terminalType,
                    terminalIP: t.terminalIP,
                    terminalPort: t.terminalPort,
                    isActive: t.isActive,
                    assignedStation: t.assignedStation
                        ? { id: t.assignedStation.id, name: t.assignedStation.name }
                        : null,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                })),
                stations: loc.stations.map(s => ({
                    id: s.id,
                    name: s.name,
                    isActive: s.isActive
                })),
                updatedAt: loc.updatedAt
            }))

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching terminal configurations:', error)
        return NextResponse.json({ error: 'Failed to fetch terminals' }, { status: 500 })
    }
}

// POST — create a new PaymentTerminal for a location
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { locationId, name, terminalIP, terminalPort, stationId } = body

        if (!locationId || !name || !terminalIP) {
            return NextResponse.json(
                { error: 'locationId, name, and terminalIP are required' },
                { status: 400 }
            )
        }

        // Validate IP format
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(terminalIP)) {
            return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
        }

        // Verify location exists
        const location = await prisma.location.findUnique({ where: { id: locationId } })
        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Create PaymentTerminal
        const terminal = await prisma.paymentTerminal.create({
            data: {
                locationId,
                name,
                terminalIP,
                terminalPort: terminalPort || '10009',
            },
            include: {
                assignedStation: { select: { id: true, name: true } }
            }
        })

        // If stationId provided, assign terminal to that station
        if (stationId) {
            await prisma.station.update({
                where: { id: stationId },
                data: { dedicatedTerminalId: terminal.id }
            })
        }

        return NextResponse.json({ terminal }, { status: 201 })
    } catch (error) {
        console.error('Error creating terminal:', error)
        return NextResponse.json({ error: 'Failed to create terminal' }, { status: 500 })
    }
}
