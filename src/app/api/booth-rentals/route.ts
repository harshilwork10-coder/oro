import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get booth rentals for a franchise/location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        const rentals = await prisma.boothRental.findMany({
            where: {
                franchiseId: user.franchiseId,
                ...(locationId ? { locationId } : {}),
                isActive: true
            },
            orderBy: { boothNumber: 'asc' }
        })

        // Get renters' info
        const rentersIds = rentals.map(r => r.userId)
        const renters = await prisma.user.findMany({
            where: { id: { in: rentersIds } },
            select: { id: true, name: true, email: true, phone: true, image: true }
        })

        const rentersMap = Object.fromEntries(renters.map(r => [r.id, r]))

        return NextResponse.json({
            rentals: rentals.map(r => ({
                ...r,
                renter: rentersMap[r.userId] || null
            }))
        })
    } catch (error) {
        console.error('Error fetching booth rentals:', error)
        return NextResponse.json({ error: 'Failed to fetch booth rentals' }, { status: 500 })
    }
}

// POST - Create a new booth rental
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only managers/owners can create booth rentals
        if (!['MANAGER', 'OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const body = await request.json()
        const { userId, boothNumber, weeklyRate, dueDay, locationId } = body

        if (!userId || !boothNumber) {
            return NextResponse.json({ error: 'User and booth number required' }, { status: 400 })
        }

        const rental = await prisma.boothRental.create({
            data: {
                franchiseId: user.franchiseId,
                locationId,
                userId,
                boothNumber,
                weeklyRate: weeklyRate || 0,
                dueDay: dueDay || 1 // Monday default
            }
        })

        return NextResponse.json({ rental }, { status: 201 })
    } catch (error) {
        console.error('Error creating booth rental:', error)
        return NextResponse.json({ error: 'Failed to create booth rental' }, { status: 500 })
    }
}

// PUT - Update booth rental
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['MANAGER', 'OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const body = await request.json()
        const { id, boothNumber, weeklyRate, dueDay, isActive } = body

        if (!id) {
            return NextResponse.json({ error: 'Rental ID required' }, { status: 400 })
        }

        const rental = await prisma.boothRental.update({
            where: { id },
            data: {
                ...(boothNumber !== undefined ? { boothNumber } : {}),
                ...(weeklyRate !== undefined ? { weeklyRate } : {}),
                ...(dueDay !== undefined ? { dueDay } : {}),
                ...(isActive !== undefined ? { isActive } : {})
            }
        })

        return NextResponse.json({ rental })
    } catch (error) {
        console.error('Error updating booth rental:', error)
        return NextResponse.json({ error: 'Failed to update booth rental' }, { status: 500 })
    }
}

// DELETE - End booth rental (set inactive)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['MANAGER', 'OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Rental ID required' }, { status: 400 })
        }

        // Soft delete - mark as inactive with end date
        await prisma.boothRental.update({
            where: { id },
            data: {
                isActive: false,
                endDate: new Date()
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error ending booth rental:', error)
        return NextResponse.json({ error: 'Failed to end booth rental' }, { status: 500 })
    }
}
