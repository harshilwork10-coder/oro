import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

