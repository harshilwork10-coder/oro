import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch recent transactions
// Supports: ?limit=N, ?status=STATUS, ?locationId=xxx
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')
        const locationId = searchParams.get('locationId')

        // Resolve franchiseId scope
        let franchiseId = user.franchiseId
        if (locationId) {
            const location = await prisma.location.findFirst({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            if (location?.franchiseId) {
                franchiseId = location.franchiseId
            }
        }

        const where: any = { franchiseId }
        if (status) where.status = status

        const transactions = await prisma.transaction.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { firstName: true, lastName: true } }
            }
        })

        return NextResponse.json({ transactions })
    } catch (error) {
        console.error('[TRANSACTIONS]', error)
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
}
