/**
 * ABC Inventory Analysis API
 *
 * GET — Classify products by revenue contribution:
 *        A = top 80% revenue, B = next 15%, C = bottom 5%
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '90')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get sales data grouped by product
        const salesData = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: {
                    franchiseId: user.franchiseId,
                    status: 'COMPLETED',
                    createdAt: { gte: since }
                }
            },
            _sum: { total: true, quantity: true }
        })

        // Get product details
        const productIds = salesData.map(s => s.productId).filter(Boolean) as string[]
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
                id: true, name: true, barcode: true, cost: true, stock: true,
                productCategory: { select: { name: true } }
            }
        })
        const productMap = new Map(products.map(p => [p.id, p]))

        // Sort by revenue descending
        const ranked = salesData
            .filter(s => s.productId && productMap.has(s.productId!))
            .map(s => ({
                productId: s.productId!,
                name: productMap.get(s.productId!)!.name,
                barcode: productMap.get(s.productId!)!.barcode,
                category: productMap.get(s.productId!)!.productCategory?.name || 'Uncategorized',
                revenue: Number(s._sum.total || 0),
                unitsSold: s._sum.quantity || 0,
                currentStock: productMap.get(s.productId!)!.stock || 0
            }))
            .sort((a, b) => b.revenue - a.revenue)

        const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0)

        // Classify: A = top 80% revenue, B = next 15%, C = bottom 5%
        let cumulative = 0
        const classified = ranked.map(item => {
            cumulative += item.revenue
            const pctOfTotal = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0
            const grade = pctOfTotal <= 80 ? 'A' : pctOfTotal <= 95 ? 'B' : 'C'

            return {
                ...item,
                revenue: Math.round(item.revenue * 100) / 100,
                pctOfTotal: Math.round((item.revenue / totalRevenue) * 1000) / 10,
                cumulativePct: Math.round(pctOfTotal * 10) / 10,
                grade
            }
        })

        const summary = {
            A: { count: classified.filter(c => c.grade === 'A').length, revenue: Math.round(classified.filter(c => c.grade === 'A').reduce((s, c) => s + c.revenue, 0) * 100) / 100 },
            B: { count: classified.filter(c => c.grade === 'B').length, revenue: Math.round(classified.filter(c => c.grade === 'B').reduce((s, c) => s + c.revenue, 0) * 100) / 100 },
            C: { count: classified.filter(c => c.grade === 'C').length, revenue: Math.round(classified.filter(c => c.grade === 'C').reduce((s, c) => s + c.revenue, 0) * 100) / 100 }
        }

        return ApiResponse.success({
            items: classified,
            summary,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            periodDays: days
        })
    } catch (error) {
        console.error('[ABC_GET]', error)
        return ApiResponse.error('Failed to generate ABC analysis', 500)
    }
}
