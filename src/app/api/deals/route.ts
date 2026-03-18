import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch active deals/promotions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const now = new Date()
        const deals = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ deals })
    } catch (error) {
        console.error('[DEALS]', error)
        return NextResponse.json({ deals: [] })
    }
}
