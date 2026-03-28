import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/top-products — Top 10 products by revenue (location-scoped, period-aware)
 * Query: ?locationId=xxx&period=today|week|month
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    const period = searchParams.get('period') || 'week'

    const now = new Date()
    let since = new Date()
    if (period === 'today') since.setHours(0, 0, 0, 0)
    else if (period === 'week') since.setDate(now.getDate() - 7)
    else if (period === 'month') since.setDate(now.getDate() - 30)

    try {
        const where: any = {
            transaction: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
            productId: { not: null }
        }
        if (locationId) where.transaction.locationId = locationId

        const lineItems = await prisma.transactionLineItem.findMany({
            where,
            select: {
                productId: true, quantity: true, total: true,
                product: { select: { name: true } },
                productNameSnapshot: true
            }
        })

        const productMap = new Map<string, { name: string; qtySold: number; revenue: number }>()
        for (const li of lineItems) {
            const pid = li.productId!
            const existing = productMap.get(pid) || { name: li.productNameSnapshot || li.product?.name || 'Product', qtySold: 0, revenue: 0 }
            existing.qtySold += li.quantity
            existing.revenue += Number(li.total)
            productMap.set(pid, existing)
        }

        const topProducts = Array.from(productMap.entries())
            .map(([id, data]) => ({ productId: id, name: data.name, qtySold: data.qtySold, revenue: Math.round(data.revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        return NextResponse.json({ topProducts, period })
    } catch (error: any) {
        console.error('[TOP_PRODUCTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch top products' }, { status: 500 })
    }
}
