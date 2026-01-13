import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, role: true, franchiseId: true }
        })

        let franchiseId = user?.franchiseId

        if (user?.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ customers: [] })
        }

        // Get clients with loyalty data
        const clients = await prisma.client.findMany({
            where: {
                franchiseId: franchiseId,
                loyaltyJoined: true
            },
            include: {
                loyalty: true
            },
            orderBy: { lastName: 'asc' }
        })

        const customers = clients.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phone || '',
            pointsBalance: c.loyalty?.pointsBalance || 0,
            lifetimePoints: c.loyalty?.lifetimePoints || 0
        }))

        return NextResponse.json({ customers })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

