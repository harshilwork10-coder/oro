import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// PATCH: Update employee's current working location
export async function PATCH(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { locationId } = await req.json()

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Verify the location exists and belongs to user's franchise
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const location = await prisma.location.findFirst({
            where: {
                id: locationId,
                franchiseId: user.franchiseId
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found or not accessible' }, { status: 404 })
        }

        // Update user's current location
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { currentLocationId: locationId },
            select: {
                id: true,
                currentLocationId: true,
                currentLocation: {
                    select: { id: true, name: true }
                }
            }
        })

        return NextResponse.json({
            success: true,
            currentLocation: updatedUser.currentLocation
        })
    } catch (error) {
        console.error('Error updating current location:', error)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

// GET: Get employee's current working location
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        return NextResponse.json({
            currentLocation: user?.currentLocation || null,
            availableLocations: user?.franchise?.locations || []
        })
    } catch (error) {
        console.error('Error getting current location:', error)
        return NextResponse.json({ error: 'Failed to get location' }, { status: 500 })
    }
}
