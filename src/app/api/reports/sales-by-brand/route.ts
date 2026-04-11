/**
 * Sales by Brand Report API
 *
 * GET — Revenue, COGS, profit, and units grouped by Product.brand
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } }
            },
            select: {
                quantity: true, total: true,
                product: { select: { brand: true, cost: true } }
            }
        })

        const brands: Record<string, { revenue: number; cogs: number; units: number }> = {}

        for (const li of lineItems) {
            const brand = li.product?.brand || 'Unbranded'
            if (!brands[brand]) brands[brand] = { revenue: 0, cogs: 0, units: 0 }

            const qty = li.quantity || 1
            brands[brand].revenue += Number(li.total || 0)
            brands[brand].cogs += Number(li.product?.cost || 0) * qty
            brands[brand].units += qty
        }

        const results = Object.entries(brands).map(([brand, b]) => ({
            brand,
            revenue: Math.round(b.revenue * 100) / 100,
            cogs: Math.round(b.cogs * 100) / 100,
            grossProfit: Math.round((b.revenue - b.cogs) * 100) / 100,
            marginPct: b.revenue > 0 ? Math.round(((b.revenue - b.cogs) / b.revenue) * 1000) / 10 : 0,
            unitsSold: b.units
        })).sort((a, b) => b.revenue - a.revenue)

        return NextResponse.json({ brands: results, periodDays: days })
    } catch (error) {
        console.error('[SALES_BRAND_GET]', error)
        return NextResponse.json({ error: 'Failed to generate sales by brand' }, { status: 500 })
    }
}
