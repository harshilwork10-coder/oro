import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch booking profile for the user's franchise locations
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all locations with their booking profiles
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                timezone: true,
                operatingHours: true,
                bookingProfile: true
            }
        })

        // Get franchise info for the booking URL
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: { slug: true, name: true }
        })

        return NextResponse.json({
            franchise: franchise ? { slug: franchise.slug, name: franchise.name } : null,
            locations: locations.map(l => ({
                id: l.id,
                name: l.name,
                slug: l.slug,
                address: l.address,
                timezone: l.timezone,
                operatingHours: l.operatingHours ? JSON.parse(l.operatingHours) : null,
                bookingProfile: l.bookingProfile
            }))
        })
    } catch (error) {
        console.error('Error fetching booking profile:', error)
        return NextResponse.json({ error: 'Failed to fetch booking profile' }, { status: 500 })
    }
}

// PUT - Update booking profile for a specific location
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['OWNER', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Only owners/managers can update booking settings' }, { status: 403 })
        }

        const body = await req.json()
        const { locationId, ...updates } = body

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Verify location belongs to this franchise
        const location = await prisma.location.findFirst({
            where: { id: locationId, franchiseId: user.franchiseId }
        })
        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Build update data from allowed fields
        const allowedFields = [
            'maxAdvanceDays', 'minNoticeMinutes', 'slotIntervalMin',
            'bufferMinutes', 'accentColor', 'welcomeMessage',
            'setupStep', 'setupCompleted'
        ]
        const updateData: Record<string, any> = {}
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field]
            }
        }

        // Handle operating hours update (stored on Location, not BookingProfile)
        if (updates.operatingHours) {
            await prisma.location.update({
                where: { id: locationId },
                data: { operatingHours: JSON.stringify(updates.operatingHours) }
            })
        }

        // Handle timezone update
        if (updates.timezone) {
            await prisma.location.update({
                where: { id: locationId },
                data: { timezone: updates.timezone }
            })
        }

        // Upsert booking profile
        const profile = await prisma.bookingProfile.upsert({
            where: { locationId },
            update: updateData,
            create: {
                locationId,
                ...updateData
            }
        })

        return NextResponse.json({ success: true, profile })
    } catch (error) {
        console.error('Error updating booking profile:', error)
        return NextResponse.json({ error: 'Failed to update booking profile' }, { status: 500 })
    }
}
