'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Department profitability (margin, not just revenue)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get line items with category info
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                transaction: { locationId, status: 'COMPLETED', createdAt: { gte: since } }
            },
            select: {
                quantity: true,
                unitPrice: true,
                total: true,
                item: {
                    select: {
                        cost: true,
                        category: { select: { id: true, name: true } }
                    }
                }
            }
        })

        // Group by department
        const depts: Record<string, {
            name: string; revenue: number; cogs: number; units: number; txCount: number
        }> = {}

        for (const li of lineItems) {
            const catName = li.item?.category?.name || 'Uncategorized'
            const catId = li.item?.category?.id || 'uncategorized'

            if (!depts[catId]) depts[catId] = { name: catName, revenue: 0, cogs: 0, units: 0, txCount: 0 }

            const qty = li.quantity || 1
            const rev = Number(li.total || 0)
            const cost = Number(li.item?.cost || 0) * qty

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

        return ApiResponse.success({ departments: results, totals, periodDays: days })
    } catch (error) {
        console.error('[DEPT_PROFIT_GET]', error)
        return ApiResponse.error('Failed to generate department profitability')
    }
}
