import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch recent transactions (alias for /api/pos/transaction)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')

        const where: any = {}
        if (user.franchiseId) where.franchiseId = user.franchiseId
        if (user.locationId) where.locationId = user.locationId
        if (status) where.status = status

        const transactions = await prisma.transaction.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { firstName: true, lastName: true } }
            }
        })

        return NextResponse.json({ transactions })
    } catch (error) {
        console.error('[TRANSACTIONS]', error)
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
}
