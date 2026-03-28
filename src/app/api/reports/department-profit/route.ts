/**
 * Department Profitability Report API
 *
 * GET — Revenue, COGS, gross profit, and margin by product category (department)
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

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get product line items with category info
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: {
                    franchiseId: user.franchiseId,
                    status: 'COMPLETED',
                    createdAt: { gte: since }
                }
            },
            select: {
                quantity: true,
                total: true,
                product: {
                    select: {
                        cost: true,
                        productCategory: { select: { id: true, name: true } }
                    }
                }
            }
        })

        // Group by category (department)
        const depts: Record<string, {
            name: string; revenue: number; cogs: number; units: number; txCount: number
        }> = {}

        for (const li of lineItems) {
            const catName = li.product?.productCategory?.name || 'Uncategorized'
            const catId = li.product?.productCategory?.id || 'uncategorized'

            if (!depts[catId]) depts[catId] = { name: catName, revenue: 0, cogs: 0, units: 0, txCount: 0 }

            const qty = li.quantity || 1
            const rev = Number(li.total || 0)
            const cost = Number(li.product?.cost || 0) * qty

            depts[catId].revenue += rev
            depts[catId].cogs += cost
            depts[catId].units += qty
            depts[catId].txCount++
        }

        const results = Object.entries(depts).map(([id, d]) => ({
            departmentId: id,
            department: d.name,
            revenue: Math.round(d.revenue * 100) / 100,
            cogs: Math.round(d.cogs * 100) / 100,
            grossProfit: Math.round((d.revenue - d.cogs) * 100) / 100,
            grossMargin: d.revenue > 0 ? Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10 : 0,
            unitsSold: d.units,
            transactions: d.txCount
        })).sort((a, b) => b.grossProfit - a.grossProfit)

        const totals = {
            revenue: Math.round(results.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
            cogs: Math.round(results.reduce((s, r) => s + r.cogs, 0) * 100) / 100,
            grossProfit: Math.round(results.reduce((s, r) => s + r.grossProfit, 0) * 100) / 100
        }

        return NextResponse.json({ departments: results, totals, periodDays: days })
    } catch (error) {
        console.error('[DEPT_PROFIT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate department profitability' }, { status: 500 })
    }
}
