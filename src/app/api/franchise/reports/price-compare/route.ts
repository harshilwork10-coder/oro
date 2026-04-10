import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prismaReadonly as prisma } from '@/lib/prisma-readonly'

/** Cross-Location Price Compare — HQ report */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId'), search = searchParams.get('search')
    try {
        const locations = await prisma.location.findMany({ where: { franchiseId: user.franchiseId }, select: { id: true, name: true } })
        if (locations.length < 2) return NextResponse.json({ error: 'Need 2+ locations for comparison' }, { status: 400 })

        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true }
        if (categoryId) where.categoryId = categoryId
        if (search) where.name = { contains: search, mode: 'insensitive' }

        const items = await prisma.item.findMany({ where, select: { id: true, name: true, barcode: true, price: true, cost: true, category: { select: { name: true } }, locationOverrides: { select: { locationId: true, price: true } } }, orderBy: { name: 'asc' }, take: 100 })

        const comparison = items.map(item => {
            const basePrice = Number(item.price), baseCost = Number(item.cost || 0)
            const prices: Record<string, number> = {}
            for (const loc of locations) { const ov = item.locationOverrides.find(o => o.locationId === loc.id); prices[loc.id] = ov ? Number(ov.price) : basePrice }
            const vals = Object.values(prices), minP = Math.min(...vals), maxP = Math.max(...vals), variance = maxP - minP
            return { itemId: item.id, name: item.name, barcode: item.barcode, category: item.category?.name || 'Uncategorized', cost: baseCost, basePrice, locationPrices: prices, minPrice: minP, maxPrice: maxP, variance: Math.round(variance * 100) / 100, hasVariance: variance > 0.01 }
        })

        const showAll = searchParams.get('showAll') === 'true'
        const filtered = showAll ? comparison : comparison.filter(c => c.hasVariance)
        return NextResponse.json({ locations, items: filtered, summary: { totalCompared: comparison.length, withVariance: comparison.filter(c => c.hasVariance).length, maxVariance: Math.max(...comparison.map(c => c.variance), 0) } })
    } catch (error: any) { console.error('[PRICE_COMPARE_GET]', error); return NextResponse.json({ error: 'Failed to generate price comparison' }, { status: 500 }) }
}
