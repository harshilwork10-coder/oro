import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get today's checked-in customers
export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = session.user.franchiseId
        const locationId = session.user.locationId

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

        // If still no franchise context, get all recent customers (for demo)
        if (!whereClause.franchiseId) {
            whereClause = {} // Get all customers as fallback
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
