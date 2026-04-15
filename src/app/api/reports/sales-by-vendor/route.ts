/**
 * Sales by Vendor Report API
 *
 * GET — Revenue, COGS, profit, and product count grouped by Product.vendor
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
                product: { select: { vendor: true, cost: true } }
            }
        })

        const vendors: Record<string, { revenue: number; cogs: number; units: number; productIds: Set<string> }> = {}

        for (const li of lineItems) {
            const vendor = li.product?.vendor || 'Unknown Vendor'
            if (!vendors[vendor]) vendors[vendor] = { revenue: 0, cogs: 0, units: 0, productIds: new Set() }

            const qty = li.quantity || 1
            vendors[vendor].revenue += Number(li.total || 0)
            vendors[vendor].cogs += Number(li.product?.cost || 0) * qty
            vendors[vendor].units += qty
        }

        const results = Object.entries(vendors).map(([vendor, v]) => ({
            vendor,
            revenue: Math.round(v.revenue * 100) / 100,
            cogs: Math.round(v.cogs * 100) / 100,
            grossProfit: Math.round((v.revenue - v.cogs) * 100) / 100,
            marginPct: v.revenue > 0 ? Math.round(((v.revenue - v.cogs) / v.revenue) * 1000) / 10 : 0,
            unitsSold: v.units
        })).sort((a, b) => b.revenue - a.revenue)

        return NextResponse.json({ vendors: results, periodDays: days })
    } catch (error) {
        console.error('[SALES_VENDOR_GET]', error)
        return NextResponse.json({ error: 'Failed to generate sales by vendor' }, { status: 500 })
    }
}
