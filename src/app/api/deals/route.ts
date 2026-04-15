import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch active deals/promotions
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
