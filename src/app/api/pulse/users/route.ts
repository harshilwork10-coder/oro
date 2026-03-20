import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: List all employees + their Pulse access status (Provider manages on behalf of owner)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can manage Pulse users (owner requests changes through Provider)
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only Provider can manage Pulse access' }, { status: 403 })
        }

        // Get the franchisor for this owner
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id },
            include: {
                config: true,
                franchises: {
                    include: {
                        locations: { select: { id: true, name: true } },
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                                hasPulseAccess: true,
                                pulseLocationIds: true
                            }
                        }
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ users: [], locations: [], seatCount: 0, pulseEnabled: false })
        }

        const pulseEnabled = franchisor.config?.usesMobilePulse ?? false
        const seatCount = franchisor.config?.pulseSeatCount ?? 0

        // Flatten all locations
        const locations = franchisor.franchises.flatMap(f => f.locations)

        // Flatten all users + include the owner
        const allUsers = franchisor.franchises.flatMap(f => f.users)

        // Include the owner themselves (they may not be in franchise users)
        const ownerUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                hasPulseAccess: true,
                pulseLocationIds: true
            }
        })

        // Deduplicate — owner might already be in allUsers
        const userMap = new Map<string, any>()
        if (ownerUser) {
            userMap.set(ownerUser.id, { ...ownerUser, isOwner: true })
        }
        allUsers.forEach(u => {
            if (!userMap.has(u.id)) {
                userMap.set(u.id, { ...u, isOwner: false })
            }
        })

        const users = Array.from(userMap.values()).map(u => ({
            ...u,
            pulseLocationIds: u.pulseLocationIds ? JSON.parse(u.pulseLocationIds) : null
        }))

        // Count active seats (excluding owner — owner doesn't count toward limit)
        const seatsUsed = users.filter(u => u.hasPulseAccess && !u.isOwner).length

        return NextResponse.json({
            users,
            locations,
            seatCount,
            seatsUsed,
            pulseEnabled
        })

    } catch (error) {
        console.error('Error fetching Pulse users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

// POST: Toggle Pulse access for a user (Provider manages on behalf of owner)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only Provider can manage Pulse access' }, { status: 403 })
        }

        const { userId, grantAccess, locationIds } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Get franchisor config to check seat limit
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id },
            include: { config: true, franchises: { select: { id: true } } }
        })

        if (!franchisor?.config?.usesMobilePulse) {
            return NextResponse.json({ error: 'Pulse is not enabled for your account' }, { status: 403 })
        }

        // Prevent removing owner's own access
        if (userId === session.user.id && !grantAccess) {
            return NextResponse.json({ error: 'Cannot remove your own Pulse access' }, { status: 400 })
        }

        // If granting access, check seat limit (owner doesn't count toward seats)
        if (grantAccess) {
            const franchiseIds = franchisor.franchises.map(f => f.id)
            const currentSeats = await prisma.user.count({
                where: {
                    hasPulseAccess: true,
                    id: { not: session.user.id }, // Owner doesn't count
                    franchiseId: { in: franchiseIds }
                }
            })

            // Check if user already has access (toggle is no-op, don't block)
            const targetUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { hasPulseAccess: true }
            })

            if (!targetUser?.hasPulseAccess && currentSeats >= franchisor.config.pulseSeatCount) {
                return NextResponse.json({
                    error: `All ${franchisor.config.pulseSeatCount} Pulse seats are in use. Contact your Oro representative for more seats.`,
                    seatsUsed: currentSeats,
                    seatCount: franchisor.config.pulseSeatCount
                }, { status: 400 })
            }
        }

        // Update user access
        const pulseLocationIds = locationIds === undefined
            ? undefined // Don't change location restriction
            : locationIds === null
                ? null // All stores
                : JSON.stringify(locationIds) // Specific stores

        const updateData: any = { hasPulseAccess: grantAccess }
        if (pulseLocationIds !== undefined) {
            updateData.pulseLocationIds = pulseLocationIds
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating Pulse access:', error)
        return NextResponse.json({ error: 'Failed to update access' }, { status: 500 })
    }
}
