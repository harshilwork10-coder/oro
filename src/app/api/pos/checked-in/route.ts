import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// Get today's checked-in customers
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = user.franchiseId
        const locationId = user.locationId

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Build where clause - try franchiseId first, then locationId
        let whereClause: any = {}

        if (franchiseId) {
            whereClause.franchiseId = franchiseId
        } else if (locationId) {
            // Get franchiseId from location
            const location = await prisma.location.findUnique({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            if (location?.franchiseId) {
                whereClause.franchiseId = location.franchiseId
            }
        }

        // BUG-4 FIX: Never fall back to all customers — that's a cross-tenant data leak
        if (!whereClause.franchiseId) {
            return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
        }

        // Find recent customers who checked in today (by createdAt for new, updatedAt for returning)
        const customers = await prisma.client.findMany({
            where: {
                ...whereClause,
                OR: [
                    { createdAt: { gte: today, lt: tomorrow } },
                    { updatedAt: { gte: today, lt: tomorrow } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 20
        })

        return NextResponse.json(customers)
    } catch (error) {
        console.error('Failed to fetch checked-in customers:', error)
        return NextResponse.json([])
    }
}

