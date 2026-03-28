/**
 * Gross Margin Report API
 *
 * GET — Per-item margin analysis: revenue vs COGS per product sold
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const categoryId = searchParams.get('categoryId')
        const sortBy = searchParams.get('sortBy') || 'grossProfit' // grossProfit, marginPct, revenue
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get product sales with cost info
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } }
            },
            select: {
                quantity: true, total: true, productId: true,
                product: {
                    select: {
                        id: true, name: true, barcode: true, sku: true, cost: true, price: true,
                        productCategory: { select: { name: true } }
                    }
                }
            }
        })

        // Filter by category if specified
        const filtered = categoryId
            ? lineItems.filter(li => li.product?.productCategory && (li.product as any).categoryId === categoryId)
            : lineItems

        // Aggregate by product
        const products: Record<string, {
            name: string; barcode: string | null; sku: string | null; category: string;
            cost: number; price: number; revenue: number; cogs: number; units: number
        }> = {}

        for (const li of filtered) {
            const p = li.product
            if (!p) continue
            const pid = p.id

            if (!products[pid]) products[pid] = {
                name: p.name, barcode: p.barcode, sku: p.sku,
                category: p.productCategory?.name || 'Uncategorized',
                cost: Number(p.cost || 0), price: Number(p.price || 0),
                revenue: 0, cogs: 0, units: 0
            }

            const qty = li.quantity || 1
            products[pid].revenue += Number(li.total || 0)
            products[pid].cogs += Number(p.cost || 0) * qty
            products[pid].units += qty
        }

        const items = Object.entries(products).map(([id, p]) => ({
            productId: id,
            name: p.name,
            barcode: p.barcode,
            sku: p.sku,
            category: p.category,
            unitCost: p.cost,
            unitPrice: p.price,
            revenue: Math.round(p.revenue * 100) / 100,
            cogs: Math.round(p.cogs * 100) / 100,
            grossProfit: Math.round((p.revenue - p.cogs) * 100) / 100,
            marginPct: p.revenue > 0 ? Math.round(((p.revenue - p.cogs) / p.revenue) * 1000) / 10 : 0,
            markup: p.cogs > 0 ? Math.round(((p.revenue - p.cogs) / p.cogs) * 1000) / 10 : 0,
            unitsSold: p.units
        }))

        // Sort
        items.sort((a, b) => {
            if (sortBy === 'marginPct') return b.marginPct - a.marginPct
            if (sortBy === 'revenue') return b.revenue - a.revenue
            return b.grossProfit - a.grossProfit
        })

        const summary = {
            totalRevenue: Math.round(items.reduce((s, i) => s + i.revenue, 0) * 100) / 100,
            totalCogs: Math.round(items.reduce((s, i) => s + i.cogs, 0) * 100) / 100,
            totalGrossProfit: Math.round(items.reduce((s, i) => s + i.grossProfit, 0) * 100) / 100,
            avgMargin: items.length > 0
                ? Math.round((items.reduce((s, i) => s + i.marginPct, 0) / items.length) * 10) / 10
                : 0,
            productCount: items.length,
            negativeMarginsCount: items.filter(i => i.marginPct < 0).length
        }

        return NextResponse.json({ items, summary, periodDays: days })
    } catch (error) {
        console.error('[GROSS_MARGIN_GET]', error)
        return NextResponse.json({ error: 'Failed to generate gross margin report' }, { status: 500 })
    }
}
