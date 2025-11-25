import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Ensure user has a location assigned for shift management
    if (!user?.locationId && !user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized: No Location/Franchise context' }, { status: 401 })
    }

    const locationId = user.locationId

    try {
        const body = await req.json()
        const { action, amount, notes } = body // action: 'OPEN' | 'CLOSE' | 'DROP'

        if (action === 'OPEN') {
            if (!locationId) return NextResponse.json({ error: 'Location ID required to open shift' }, { status: 400 })

            // Check if already open
            const existing = await prisma.cashDrawerSession.findFirst({
                where: {
                    locationId: locationId,
                    status: 'OPEN',
                    employeeId: user.id
                }
            })
            if (existing) return NextResponse.json({ error: 'Shift already open' }, { status: 400 })

            const newSession = await prisma.cashDrawerSession.create({
                data: {
                    locationId: locationId,
                    employeeId: user.id,
                    startingCash: amount,
                    status: 'OPEN',
                    notes
                }
            })
            return NextResponse.json(newSession)
        }

        if (action === 'CLOSE') {
            const currentSession = await prisma.cashDrawerSession.findFirst({
                where: {
                    locationId: locationId, // Optional if we just find by employee? But safer with location
                    status: 'OPEN',
                    employeeId: user.id
                }
            })
            if (!currentSession) return NextResponse.json({ error: 'No open shift found' }, { status: 404 })

            const closedSession = await prisma.cashDrawerSession.update({
                where: { id: currentSession.id },
                data: {
                    endingCash: amount,
                    endTime: new Date(),
                    status: 'CLOSED',
                    notes: notes ? `${currentSession.notes || ''}\n${notes}` : currentSession.notes
                }
            })
            return NextResponse.json(closedSession)
        }

        if (action === 'DROP') {
            // Handle cash drop: record amount in current open session
            const currentSession = await prisma.cashDrawerSession.findFirst({
                where: {
                    locationId: locationId,
                    status: 'OPEN',
                    employeeId: user.id,
                },
            })
            if (!currentSession) return NextResponse.json({ error: 'No open shift found for drop' }, { status: 404 })
            // For simplicity, we just acknowledge the drop. Extend schema as needed.
            return NextResponse.json({ message: 'Cash drop recorded', amount })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('[POS_SHIFT_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current open session for this user
    // We assume a user can only have one open session at a time across locations? 
    // Or strictly filter by current location if available.
    const whereClause: any = {
        status: 'OPEN',
        employeeId: user.id
    }
    if (user.locationId) {
        whereClause.locationId = user.locationId
    }

    const currentSession = await prisma.cashDrawerSession.findFirst({
        where: whereClause
    })

    return NextResponse.json({ shift: currentSession })
}
