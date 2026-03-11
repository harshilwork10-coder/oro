/**
 * Reorder Report API
 *
 * GET — Products at or below reorder point/min stock level
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
        const includeOutOfStock = searchParams.get('includeOutOfStock') !== 'false' // default true
        const categoryId = searchParams.get('categoryId')
        const vendor = searchParams.get('vendor')

        // Get all active products that have reorder thresholds
        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }
        if (categoryId) where.categoryId = categoryId
        if (vendor) where.vendor = vendor

        const products = await prisma.product.findMany({
            where,
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, cost: true, price: true,
                reorderPoint: true, minStock: true, parLevel: true,
                vendor: true, brand: true,
                productCategory: { select: { name: true } }
            }
        })

        // Filter to items needing reorder
        const needsReorder = products.filter(p => {
            const stock = p.stock || 0
            if (stock <= 0 && includeOutOfStock) return true
            if (p.reorderPoint && stock <= p.reorderPoint) return true
            if (p.minStock && stock <= p.minStock) return true
            return false
        }).map(p => {
            const stock = p.stock || 0
            const reorderPoint = p.reorderPoint || 0
            const parLevel = p.parLevel || 0
            const suggestedOrder = parLevel > 0 ? Math.max(0, parLevel - stock) : (reorderPoint > 0 ? reorderPoint * 2 - stock : 0)

            return {
                productId: p.id,
                name: p.name,
                barcode: p.barcode,
                sku: p.sku,
                category: p.productCategory?.name || 'Uncategorized',
                vendor: p.vendor,
                brand: p.brand,
                currentStock: stock,
                reorderPoint: p.reorderPoint,
                minStock: p.minStock,
                parLevel: p.parLevel,
                suggestedOrder: Math.max(0, suggestedOrder),
                unitCost: Number(p.cost || 0),
                orderCost: Math.round(Math.max(0, suggestedOrder) * Number(p.cost || 0) * 100) / 100,
                urgency: stock <= 0 ? 'OUT_OF_STOCK' : stock <= (p.minStock || 0) ? 'CRITICAL' : 'LOW'
            }
        }).sort((a, b) => {
            const urgencyOrder: Record<string, number> = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2 }
            return (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3)
        })

        const summary = {
            totalItems: needsReorder.length,
            outOfStock: needsReorder.filter(r => r.urgency === 'OUT_OF_STOCK').length,
            critical: needsReorder.filter(r => r.urgency === 'CRITICAL').length,
            low: needsReorder.filter(r => r.urgency === 'LOW').length,
            totalOrderCost: Math.round(needsReorder.reduce((s, r) => s + r.orderCost, 0) * 100) / 100
        }

        return ApiResponse.success({ items: needsReorder, summary })
    } catch (error) {
        console.error('[REORDER_GET]', error)
        return ApiResponse.error('Failed to generate reorder report', 500)
    }
}
