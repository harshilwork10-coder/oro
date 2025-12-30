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

// GET - List all terminals for this location (PROVIDER only)
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    // ONLY PROVIDER can access
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = await getUserLocationId(user)
    if (!locationId) {
        return NextResponse.json({ terminals: [] })
    }

    const terminals = await prisma.paymentTerminal.findMany({
        where: { locationId },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json({ terminals })
}

// POST - Create new terminal (PROVIDER only)
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    // ONLY PROVIDER can create
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = await getUserLocationId(user)
    if (!locationId) {
        return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
    }

    const { name, terminalIP, terminalPort, terminalType } = await request.json()

    if (!name || !terminalIP) {
        return NextResponse.json({ error: 'Name and IP address required' }, { status: 400 })
    }

    const terminal = await prisma.paymentTerminal.create({
        data: {
            locationId,
            name,
            terminalIP,
            terminalPort: terminalPort || '10009',
            terminalType: terminalType || 'PAX'
        }
    })

    return NextResponse.json({ terminal })
}

// DELETE - Delete a terminal (PROVIDER only)
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
        return NextResponse.json({ error: 'Terminal ID required' }, { status: 400 })
    }

    await prisma.paymentTerminal.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}

