import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user?.locationId) {
        // If user has no location assigned, return empty queue
        return NextResponse.json([])
    }

    try {
        const queueItems = await (prisma as any).checkIn.findMany({
            where: {
                locationId: user.locationId,
                status: 'WAITING'
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
            service: 'General Check-in', // Placeholder as service intent is not yet captured in CheckIn
            checkedInAt: item.checkedInAt,
            queuePosition: index + 1
        }))

        return NextResponse.json(formattedQueue)
    } catch (error) {
        console.error('Error fetching queue:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

