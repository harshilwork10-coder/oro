import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

// GET - List all stations for a location (PROVIDER only)
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Provider can pass locationId to get stations for specific location
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
        return NextResponse.json({ stations: [] })
    }

    const stations = await prisma.station.findMany({
        where: { locationId },
        include: { dedicatedTerminal: true },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json({ stations })
}

// POST - Create new station (PROVIDER only)
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId, name, pairingCode } = await request.json()

    if (!locationId || !name || !pairingCode) {
        return NextResponse.json({ error: 'Location, name and pairing code required' }, { status: 400 })
    }

    // Check for duplicate pairing code
    const existing = await prisma.station.findFirst({
        where: { pairingCode: pairingCode.toUpperCase() }
    })
    if (existing) {
        return NextResponse.json({ error: 'Pairing code already exists' }, { status: 400 })
    }

    const station = await prisma.station.create({
        data: {
            locationId,
            name,
            pairingCode: pairingCode.toUpperCase(),
            paymentMode: 'CASH_ONLY'
        }
    })

    return NextResponse.json({ station })
}

// DELETE - Delete a station (PROVIDER only)
export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any
    // ONLY PROVIDER can delete
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Station ID required' }, { status: 400 })
    }

    await prisma.station.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}
