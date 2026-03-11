/**
 * Waste / Damage / Expired Report API
 *
 * GET — Track inventory losses from waste, damage, theft, expired items
 *        Uses StockAdjustment with negative quantities and specific reasons
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
        const reason = searchParams.get('reason') // DAMAGE, EXPIRED, WASTE, THEFT
        const since = new Date(); since.setDate(since.getDate() - days)

        // Loss-related stock adjustments (negative quantity = loss)
        const lossReasons = reason ? [reason] : ['DAMAGE', 'EXPIRED', 'WASTE', 'THEFT', 'SPOILAGE', 'BREAKAGE']

        const adjustments = await prisma.stockAdjustment.findMany({
            where: {
                product: { franchiseId: user.franchiseId },
                reason: { in: lossReasons },
                quantity: { lt: 0 },
                createdAt: { gte: since }
            },
            include: {
                product: { select: { id: true, name: true, barcode: true, cost: true, price: true, productCategory: { select: { name: true } } } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const items = adjustments.map(a => ({
            id: a.id,
            date: a.createdAt,
            product: a.product.name,
            barcode: a.product.barcode,
            category: a.product.productCategory?.name || 'Uncategorized',
            location: a.location.name,
            quantity: Math.abs(a.quantity),
            reason: a.reason,
            notes: a.notes,
            costLoss: Math.round(Math.abs(a.quantity) * Number(a.product.cost || 0) * 100) / 100,
            retailLoss: Math.round(Math.abs(a.quantity) * Number(a.product.price || 0) * 100) / 100,
            performedBy: a.performedBy
        }))

        // Summary by reason
        const byReason: Record<string, { count: number; units: number; costLoss: number }> = {}
        for (const item of items) {
            if (!byReason[item.reason]) byReason[item.reason] = { count: 0, units: 0, costLoss: 0 }
            byReason[item.reason].count++
            byReason[item.reason].units += item.quantity
            byReason[item.reason].costLoss += item.costLoss
        }
        for (const key of Object.keys(byReason)) {
            byReason[key].costLoss = Math.round(byReason[key].costLoss * 100) / 100
        }

        // Top loss products
        const productLoss: Record<string, { name: string; totalLoss: number; units: number }> = {}
        for (const item of items) {
            if (!productLoss[item.product]) productLoss[item.product] = { name: item.product, totalLoss: 0, units: 0 }
            productLoss[item.product].totalLoss += item.costLoss
            productLoss[item.product].units += item.quantity
        }
        const topLosses = Object.values(productLoss)
            .sort((a, b) => b.totalLoss - a.totalLoss)
            .slice(0, 10)
            .map(p => ({ ...p, totalLoss: Math.round(p.totalLoss * 100) / 100 }))

        return ApiResponse.success({
            items,
            summary: {
                totalIncidents: items.length,
                totalUnitsLost: items.reduce((s, i) => s + i.quantity, 0),
                totalCostLoss: Math.round(items.reduce((s, i) => s + i.costLoss, 0) * 100) / 100,
                totalRetailLoss: Math.round(items.reduce((s, i) => s + i.retailLoss, 0) * 100) / 100,
                byReason
            },
            topLosses,
            periodDays: days
        })
    } catch (error) {
        console.error('[WASTE_DAMAGE_GET]', error)
        return ApiResponse.error('Failed to generate waste/damage report', 500)
    }
}
