import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// Get today's checked-in customers — reads from the CheckIn table
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const franchiseId = user.franchiseId

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Get location IDs for this franchise (tenant isolation)
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        if (locationIds.length === 0) {
            return NextResponse.json([])
        }

        // Query the CheckIn table for today's check-ins
        const checkIns = await prisma.checkIn.findMany({
            where: {
                locationId: { in: locationIds },
                checkedInAt: { gte: today, lt: tomorrow },
                status: 'WAITING'
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: { checkedInAt: 'desc' },
            take: 20
        })

        // Map to the same response shape consumers expect:
        // array of { id, firstName, lastName, phone, email, createdAt, updatedAt }
        const customers = checkIns.map(ci => ({
            id: ci.client.id,
            firstName: ci.client.firstName,
            lastName: ci.client.lastName,
            phone: ci.client.phone,
            email: ci.client.email,
            createdAt: ci.checkedInAt,
            updatedAt: ci.updatedAt
        }))

        return NextResponse.json(customers)
    } catch (error) {
        console.error('Failed to fetch checked-in customers:', error)
        return NextResponse.json([])
    }
}
