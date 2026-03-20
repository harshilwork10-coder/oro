/**
 * Stock Adjustments Log API
 *
 * GET — All inventory adjustments (damage, theft, recount, restock) with details
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
        const days = parseInt(searchParams.get('days') || '30')
        const reason = searchParams.get('reason') // SALE, RESTOCK, DAMAGE, THEFT, TRANSFER
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const since = new Date(); since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            product: { franchiseId: user.franchiseId },
            createdAt: { gte: since }
        }
        if (reason) where.reason = reason

        const [adjustments, total] = await Promise.all([
            prisma.stockAdjustment.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, barcode: true, sku: true, cost: true } },
                    location: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.stockAdjustment.count({ where })
        ])

        const items = adjustments.map(a => ({
            id: a.id,
            date: a.createdAt,
            product: a.product.name,
            productId: a.product.id,
            barcode: a.product.barcode,
            sku: a.product.sku,
            location: a.location.name,
            quantity: a.quantity,
            reason: a.reason,
            notes: a.notes,
            performedBy: a.performedBy,
            dollarImpact: Math.round(Math.abs(a.quantity) * Number(a.product.cost || 0) * 100) / 100
        }))

        // Summary by reason
        const allAdjustments = await prisma.stockAdjustment.findMany({
            where: { product: { franchiseId: user.franchiseId }, createdAt: { gte: since } },
            select: { quantity: true, reason: true, product: { select: { cost: true } } }
        })

        const byReason: Record<string, { count: number; totalUnits: number; totalDollars: number }> = {}
        for (const adj of allAdjustments) {
            if (!byReason[adj.reason]) byReason[adj.reason] = { count: 0, totalUnits: 0, totalDollars: 0 }
            byReason[adj.reason].count++
            byReason[adj.reason].totalUnits += Math.abs(adj.quantity)
            byReason[adj.reason].totalDollars += Math.abs(adj.quantity) * Number(adj.product.cost || 0)
        }

        // Round dollars
        for (const key of Object.keys(byReason)) {
            byReason[key].totalDollars = Math.round(byReason[key].totalDollars * 100) / 100
        }

        return ApiResponse.success({
            adjustments: items,
            summary: { byReason, totalAdjustments: total },
            pagination: { page, pages: Math.ceil(total / limit), total },
            periodDays: days
        })
    } catch (error) {
        console.error('[STOCK_ADJ_GET]', error)
        return ApiResponse.error('Failed to generate stock adjustments', 500)
    }
}
