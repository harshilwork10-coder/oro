import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'PROVIDER' || session.user.providerRole !== 'SALES') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const sales = await prisma.franchisor.findMany({
            where: {
                salesAgentId: session.user.id,
                deletedAt: null
            },
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(sales)
    } catch (error) {
        console.error('Error fetching sales:', error)
        return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
    }
}
