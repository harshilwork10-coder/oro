import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get all users with Pulse access for the owner's franchise
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Owner/Franchisor can manage their employees' Pulse access
        if (session.user.role !== 'FRANCHISOR' && session.user.role !== 'OWNER' && session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get owner's franchise
        const owner = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                franchisor: {
                    include: {
                        franchises: {
                            include: {
                                locations: true
                            }
                        }
                    }
                }
            }
        })

        if (!owner?.franchisor) {
            return NextResponse.json({ users: [], locations: [] })
        }

        // Get all locations
        const locations = owner.franchisor.franchises.flatMap(f => f.locations)

        // Get users with Pulse access for this franchise
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { franchiseId: { in: owner.franchisor.franchises.map(f => f.id) } },
                    { id: owner.id } // Include self
                ],
                hasPulseAccess: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                hasPulseAccess: true,
                pulseLocationIds: true
            }
        })

        // Parse pulseLocationIds for each user
        const usersWithParsedLocations = users.map(u => ({
            ...u,
            pulseLocationIds: u.pulseLocationIds ? JSON.parse(u.pulseLocationIds) : null
        }))

        return NextResponse.json({
            users: usersWithParsedLocations,
            locations: locations.map(l => ({ id: l.id, name: l.name }))
        })

    } catch (error) {
        console.error('Error fetching Pulse users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

// PATCH: Update a user's Pulse location access
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.role !== 'FRANCHISOR' && session.user.role !== 'OWNER' && session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { userId, locationIds } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // locationIds can be null (all locations) or an array of location IDs
        const pulseLocationIds = locationIds === null ? null : JSON.stringify(locationIds)

        await prisma.user.update({
            where: { id: userId },
            data: { pulseLocationIds }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating Pulse access:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
