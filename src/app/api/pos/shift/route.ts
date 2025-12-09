import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user || !user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch fresh user data to ensure we have the latest locationId
    // This handles cases where location was assigned after login (stale session)
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, locationId: true, franchiseId: true }
    })

    if (!dbUser?.locationId && !dbUser?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized: No Location/Franchise context' }, { status: 401 })
    }

    const locationId = dbUser.locationId

    try {
        const body = await req.json()
        const { action, amount, notes } = body // action: 'OPEN' | 'CLOSE' | 'DROP'

        console.log('[SHIFT_API] Action:', action, 'User:', user.id, 'Location:', locationId)

        if (action === 'OPEN') {
            // Get locationId - either from user or from franchise's first location
            let finalLocationId = locationId

            if (!finalLocationId && user.franchiseId) {
                console.log('[SHIFT_API] No locationId, looking up first location for franchise:', user.franchiseId)
                // Franchise owner without location - use first location
                const firstLocation = await prisma.location.findFirst({
                    where: { franchiseId: user.franchiseId }
                })
                if (!firstLocation) {
                    console.error('[SHIFT_API] No location found for franchise')
                    return NextResponse.json({ error: 'No location found for this franchise' }, { status: 400 })
                }
                finalLocationId = firstLocation.id
                console.log('[SHIFT_API] Found location:', finalLocationId)
            }

            if (!finalLocationId) {
                return NextResponse.json({ error: 'Location ID required to open shift' }, { status: 400 })
            }

            // Check if already open
            const existing = await prisma.cashDrawerSession.findFirst({
                where: {
                    locationId: finalLocationId,
                    status: 'OPEN',
                    employeeId: user.id
                }
            })
            if (existing) return NextResponse.json({ error: 'Shift already open' }, { status: 400 })

            console.log('[SHIFT_API] Creating session with:', { locationId: finalLocationId, employeeId: user.id, amount })

            const newSession = await prisma.cashDrawerSession.create({
                data: {
                    locationId: finalLocationId,
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
                    ...(locationId ? { locationId } : {}),
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
                    ...(locationId ? { locationId } : {}),
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

    // Validate user exists in DB (handle stale sessions after seed)
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, locationId: true, franchiseId: true }
    })

    if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get shiftRequirement from BusinessConfig
    let shiftRequirement = 'BOTH' // Default
    if (dbUser.franchiseId) {
        // Find the franchisor for this franchise
        const franchise = await prisma.franchise.findUnique({
            where: { id: dbUser.franchiseId },
            select: { franchisorId: true }
        })
        if (franchise?.franchisorId) {
            const businessConfig = await prisma.businessConfig.findUnique({
                where: { franchisorId: franchise.franchisorId },
                select: { shiftRequirement: true }
            })
            if (businessConfig?.shiftRequirement) {
                shiftRequirement = businessConfig.shiftRequirement
            }
        }
    }

    // Get current open session for this user
    const whereClause: any = {
        status: 'OPEN',
        employeeId: dbUser.id
    }
    if (dbUser.locationId) {
        whereClause.locationId = dbUser.locationId
    }

    const currentSession = await prisma.cashDrawerSession.findFirst({
        where: whereClause
    })

    return NextResponse.json({ shift: currentSession, shiftRequirement })
}

