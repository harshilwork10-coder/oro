import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED' // Only show completed transactions for potential refund
            },
            include: {
                lineItems: true,
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 for performance
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error('[POS_TRANSACTIONS_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
