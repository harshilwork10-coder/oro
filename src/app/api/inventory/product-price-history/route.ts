import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch price + cost change history for a product
export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        if (!productId) {
            return NextResponse.json({ error: 'productId is required' }, { status: 400 })
        }

        // Verify product belongs to franchise
        const product = await prisma.product.findFirst({
            where: { id: productId, franchiseId: user.franchiseId },
            select: { id: true, name: true }
        })
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const limit = parseInt(searchParams.get('limit') || '50')

        // Fetch price change logs
        const priceLogs = await (prisma as any).priceChangeLog.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        // Fetch cost history
        const costHistory = await (prisma as any).productCostHistory.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        // Merge and sort by date (newest first)
        const events = [
            ...priceLogs.map((log: any) => ({
                type: 'PRICE_CHANGE',
                date: log.createdAt,
                oldPrice: log.oldPrice ? Number(log.oldPrice) : null,
                newPrice: log.newPrice ? Number(log.newPrice) : null,
                oldCost: log.oldCost ? Number(log.oldCost) : null,
                newCost: log.newCost ? Number(log.newCost) : null,
                reason: log.reason,
                source: log.source,
                changedBy: log.changedByName || log.changedBy
            })),
            ...costHistory.map((ch: any) => ({
                type: 'COST_CHANGE',
                date: ch.createdAt,
                oldCost: ch.oldCost ? Number(ch.oldCost) : null,
                newCost: ch.newCost ? Number(ch.newCost) : null,
                changePct: ch.changePct ? Number(ch.changePct) : null,
                sourceType: ch.sourceType,
                changedBy: ch.changedBy
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return NextResponse.json({ events, productName: product.name })
    } catch (error) {
        console.error('[PRODUCT_PRICE_HISTORY]', error)
        return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }
}
