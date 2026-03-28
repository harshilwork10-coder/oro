/**
 * Inventory Valuation Report API
 *
 * GET — Total inventory value at cost and at retail price, grouped by category
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
        const includeZeroStock = searchParams.get('includeZeroStock') === 'true'
        const categoryId = searchParams.get('categoryId')

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }
        if (!includeZeroStock) where.stock = { gt: 0 }
        if (categoryId) where.categoryId = categoryId

        const products = await prisma.product.findMany({
            where,
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, cost: true, price: true,
                productCategory: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        })

        const items = products.map(p => {
            const stock = p.stock || 0
            const cost = Number(p.cost || 0)
            const retail = Number(p.price || 0)

            return {
                productId: p.id,
                name: p.name,
                barcode: p.barcode,
                sku: p.sku,
                category: p.productCategory?.name || 'Uncategorized',
                stock,
                unitCost: cost,
                unitRetail: retail,
                costValue: Math.round(stock * cost * 100) / 100,
                retailValue: Math.round(stock * retail * 100) / 100,
                potentialProfit: Math.round(stock * (retail - cost) * 100) / 100
            }
        })

        // Group by category for summary
        const catSummary: Record<string, { costValue: number; retailValue: number; productCount: number; units: number }> = {}
        for (const item of items) {
            const cat = item.category
            if (!catSummary[cat]) catSummary[cat] = { costValue: 0, retailValue: 0, productCount: 0, units: 0 }
            catSummary[cat].costValue += item.costValue
            catSummary[cat].retailValue += item.retailValue
            catSummary[cat].productCount++
            catSummary[cat].units += item.stock
        }

        const categoryBreakdown = Object.entries(catSummary).map(([name, s]) => ({
            category: name,
            costValue: Math.round(s.costValue * 100) / 100,
            retailValue: Math.round(s.retailValue * 100) / 100,
            potentialProfit: Math.round((s.retailValue - s.costValue) * 100) / 100,
            productCount: s.productCount,
            totalUnits: s.units
        })).sort((a, b) => b.costValue - a.costValue)

        const totals = {
            totalCostValue: Math.round(items.reduce((s, i) => s + i.costValue, 0) * 100) / 100,
            totalRetailValue: Math.round(items.reduce((s, i) => s + i.retailValue, 0) * 100) / 100,
            totalPotentialProfit: Math.round(items.reduce((s, i) => s + i.potentialProfit, 0) * 100) / 100,
            productCount: items.length,
            totalUnits: items.reduce((s, i) => s + i.stock, 0)
        }

        return NextResponse.json({ items, categoryBreakdown, totals })
    } catch (error) {
        console.error('[INV_VALUATION_GET]', error)
        return NextResponse.json({ error: 'Failed to generate inventory valuation' }, { status: 500 })
    }
}
