import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateStationCode } from '@/lib/codeGenerator'

// Helper to get user's locationId (direct or via franchise)
async function getUserLocationId(user: any): Promise<string | null> {
    if (user.locationId) return user.locationId

    // Look up user's location from database
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

    return userData?.locationId || userData?.franchise?.locations?.[0]?.id || null
}


// Helper to verify user access to a location
async function verifyLocationAccess(user: any, targetLocationId: string) {
    if (user.role === 'PROVIDER') return true

    // For Franchisors/Franchisees, check if the location belongs to their franchise
    if (user.role === 'FRANCHISOR' || user.role === 'FRANCHISEE') {
        const location = await prisma.location.findUnique({
            where: { id: targetLocationId },
            select: { franchiseId: true }
        })
        return location?.franchiseId === user.franchiseId
    }

    return false
}

// GET - List all stations for a location
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
        return NextResponse.json({ stations: [] }) // Default empty if no location specified
    }

    // Verify Access
    const hasAccess = await verifyLocationAccess(user, locationId)
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized access to this location' }, { status: 403 })
    }

    const stations = await prisma.station.findMany({
        where: { locationId },
        include: { dedicatedTerminal: true },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json({ stations })
}

// POST - Create new station
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any

    const { locationId, name, pairingCode: providedCode, paymentMode, terminalId } = await request.json()

    if (!locationId || !name) {
        return NextResponse.json({ error: 'Location and name required' }, { status: 400 })
    }

    // Verify Access
    const hasAccess = await verifyLocationAccess(user, locationId)
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized access to this location' }, { status: 403 })
    }

    // Get existing station count for numbering
    const existingStations = await prisma.station.findMany({
        where: { locationId },
        select: { pairingCode: true }
    })

    // Auto-generate pairing code if not provided
    const existingCodes = existingStations.map(s => s.pairingCode).filter(Boolean) as string[]
    const stationNumber = existingStations.length + 1
    const pairingCode = (providedCode?.toUpperCase()) || generateStationCode(stationNumber, existingCodes)

    // Check for duplicate pairing code globally or locally? Pairing codes must be unique globally ideally or handled carefully
    const existing = await prisma.station.findFirst({
        where: { pairingCode }
    })
    if (existing) {
        return NextResponse.json({ error: 'Pairing code already exists. Please try again.' }, { status: 400 })
    }

    const station = await prisma.station.create({
        data: {
            locationId,
            name,
            pairingCode,
            paymentMode: paymentMode || 'CASH_ONLY',
            dedicatedTerminalId: terminalId || null,
            isActive: true
        }
    })

    return NextResponse.json({ station })
}

// DELETE - Delete a station
export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Station ID required' }, { status: 400 })
    }

    // Determine location of the station to verify access
    const station = await prisma.station.findUnique({
        where: { id },
        select: { locationId: true }
    })

    if (!station) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Verify Access
    const hasAccess = await verifyLocationAccess(user, station.locationId)
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.station.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}

// PATCH - Update station name
export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Station ID required' }, { status: 400 })
    }

    const { name, paymentMode, terminalId } = await request.json()

    // Allow partial updates
    if (!name?.trim() && !paymentMode && terminalId === undefined) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Determine location of the station to verify access
    const station = await prisma.station.findUnique({
        where: { id },
        select: { locationId: true }
    })

    if (!station) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Verify Access
    const hasAccess = await verifyLocationAccess(user, station.locationId)
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updatedStation = await prisma.station.update({
        where: { id },
        data: {
            ...(name && { name: name.trim() }),
            ...(paymentMode && { paymentMode }),
            ...(terminalId !== undefined && { dedicatedTerminalId: terminalId || null })
        }
    })

    return NextResponse.json({ station: updatedStation })
}

