import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const authUser = await getAuthUser(request)
    if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // P0 FIX: Was `user.email` (self-reference crash). Now correctly uses `authUser.email`.
    const user = await prisma.user.findUnique({
        where: { email: authUser.email }
    })

    if (!user?.locationId) {
        // If user has no location assigned, return empty queue
        return NextResponse.json([])
    }

    try {
        // Query check-ins for THIS location only (location isolation)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const queueItems = await prisma.checkIn.findMany({
            where: {
                locationId: user.locationId,
                status: 'WAITING',
                checkedInAt: { gte: today, lt: tomorrow }
            },
            include: {
                client: true
            },
            orderBy: {
                checkedInAt: 'asc'
            }
        })

        const formattedQueue = queueItems.map((item: any, index: number) => ({
            id: item.id,
            customerName: item.client.firstName + ' ' + item.client.lastName,
            phone: item.client.phone,
            source: item.source,
            checkedInAt: item.checkedInAt,
            queuePosition: index + 1
        }))

        return NextResponse.json(formattedQueue)
    } catch (error) {
        console.error('Error fetching queue:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
