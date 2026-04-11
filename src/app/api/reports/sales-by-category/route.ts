/**
 * Sales by Category/Department Report API
 *
 * GET — Revenue, COGS, profit, and units grouped by product category
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
                quantity: true, total: true, transactionId: true,
                product: {
                    select: {
                        cost: true,
                        productCategory: {
                            select: { id: true, name: true, department: { select: { id: true, name: true } } }
                        }
                    }
                }
            }
        })

        const cats: Record<string, {
            name: string; departmentId: string | null; departmentName: string | null;
            revenue: number; cogs: number; units: number; txIds: Set<string>
        }> = {}

        for (const li of lineItems) {
            const cat = li.product?.productCategory
            const catId = cat?.id || 'uncategorized'
            const catName = cat?.name || 'Uncategorized'

            if (!cats[catId]) cats[catId] = {
                name: catName,
                departmentId: cat?.department?.id || null,
                departmentName: cat?.department?.name || null,
                revenue: 0, cogs: 0, units: 0, txIds: new Set()
            }

            const qty = li.quantity || 1
            cats[catId].revenue += Number(li.total || 0)
            cats[catId].cogs += Number(li.product?.cost || 0) * qty
            cats[catId].units += qty
            cats[catId].txIds.add(li.transactionId)
        }

        const categories = Object.entries(cats).map(([id, c]) => ({
            categoryId: id,
            category: c.name,
            departmentId: c.departmentId,
            department: c.departmentName,
            revenue: Math.round(c.revenue * 100) / 100,
            cogs: Math.round(c.cogs * 100) / 100,
            grossProfit: Math.round((c.revenue - c.cogs) * 100) / 100,
            marginPct: c.revenue > 0 ? Math.round(((c.revenue - c.cogs) / c.revenue) * 1000) / 10 : 0,
            unitsSold: c.units,
            txCount: c.txIds.size
        })).sort((a, b) => b.revenue - a.revenue)

        const totals = {
            revenue: Math.round(categories.reduce((s, c) => s + c.revenue, 0) * 100) / 100,
            cogs: Math.round(categories.reduce((s, c) => s + c.cogs, 0) * 100) / 100,
            grossProfit: Math.round(categories.reduce((s, c) => s + c.grossProfit, 0) * 100) / 100,
            totalCategories: categories.length
        }

        return NextResponse.json({ categories, totals, periodDays: days })
    } catch (error) {
        console.error('[SALES_CATEGORY_GET]', error)
        return NextResponse.json({ error: 'Failed to generate sales by category' }, { status: 500 })
    }
}
