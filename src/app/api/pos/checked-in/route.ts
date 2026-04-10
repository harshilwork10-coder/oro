import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pos/checked-in
 * 
 * Returns today's checked-in customers for the CURRENT LOCATION only.
 * Used by Android POS to populate the cashier queue via 30-second polling.
 * 
 * Location isolation: Filters by user.locationId (set during station pairing),
 * NOT by franchiseId. A cashier at Location A will never see Location B's queue.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // ═══ LOCATION ISOLATION: Filter by user's assigned location ═══
        // Previously used all franchise locationIds — that showed cross-location check-ins.
        // Now strictly scoped to the cashier's own location.
        const locationId = user.locationId
        if (!locationId) {
            // User has no location assigned (e.g., roaming admin) — empty queue
            return NextResponse.json([])
        }

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Query the CheckIn table for today's WAITING check-ins at THIS location
        const checkIns = await prisma.checkIn.findMany({
            where: {
                locationId: locationId,
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
            orderBy: { checkedInAt: 'asc' },
            take: 50
        })

        // Map to response shape expected by Android POS POSService
        const customers = checkIns.map(ci => ({
            id: ci.id,  // CheckIn record ID (for status updates)
            clientId: ci.client.id,
            firstName: ci.client.firstName,
            lastName: ci.client.lastName,
            phone: ci.client.phone,
            email: ci.client.email,
            source: ci.source,
            checkedInAt: ci.checkedInAt,
            updatedAt: ci.updatedAt
        }))

        return NextResponse.json(customers)
    } catch (error) {
        console.error('Failed to fetch checked-in customers:', error)
        return NextResponse.json([])
    }
}
