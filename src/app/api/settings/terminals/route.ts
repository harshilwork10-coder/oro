import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { logActivity } from '@/lib/auditLog'

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
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
export async function POST(req: NextRequest) {
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
// ONLY PROVIDER can create
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = await getUserLocationId(user)
    if (!locationId) {
        return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
    }

    try {
        const { name, terminalIP, terminalPort, terminalType } = await req.json()

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

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'CREATE',
            entityType: 'PaymentTerminal',
            entityId: terminal.id,
            metadata: { name, terminalIP, terminalType: terminalType || 'PAX' }
        })

        return NextResponse.json({ terminal })
    } catch (error) {
        console.error('[TERMINALS_POST]', error)
        return NextResponse.json({ error: 'Failed to create terminal' }, { status: 500 })
    }
}

// DELETE - Delete a terminal (PROVIDER only)
export async function DELETE(req: NextRequest) {
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
// ONLY PROVIDER can delete
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Terminal ID required' }, { status: 400 })
    }

    try {
        await prisma.paymentTerminal.delete({
            where: { id }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'DELETE',
            entityType: 'PaymentTerminal',
            entityId: id,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[TERMINALS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete terminal' }, { status: 500 })
    }
}
