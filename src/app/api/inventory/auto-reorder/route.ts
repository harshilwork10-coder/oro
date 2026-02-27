'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Auto-reorder suggestions: items below par level
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        // Find all items with par levels that are below par
        const items = await prisma.item.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'PRODUCT',
                isActive: true,
                parLevel: { not: null }
            },
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                stock: true,
                cost: true,
                parLevel: true,
                autoReorderQty: true,
                preferredSupplierId: true,
                reorderPoint: true,
                category: { select: { name: true } }
            }
        })

        const suggestions = items
            .filter(item => {
                const stock = item.stock || 0
                const par = item.parLevel || 0
                return stock < par
            })
            .map(item => {
                const stock = item.stock || 0
                const par = item.parLevel || 0
                const deficit = par - stock
                const orderQty = item.autoReorderQty || deficit
                const cost = Number(item.cost || 0)

                return {
                    itemId: item.id,
                    name: item.name,
                    barcode: item.barcode,
                    sku: item.sku,
                    category: item.category?.name || 'Uncategorized',
                    currentStock: stock,
                    parLevel: par,
                    deficit,
                    suggestedOrderQty: orderQty,
                    estimatedCost: Math.round(orderQty * cost * 100) / 100,
                    preferredSupplierId: item.preferredSupplierId,
                    urgency: stock === 0 ? 'CRITICAL' : stock <= (item.reorderPoint || 0) ? 'HIGH' : 'NORMAL'
                }
            })
            .sort((a, b) => {
                const urgencyOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2 }
                return (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 2) -
                    (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 2)
            })

        const summary = {
            totalItems: suggestions.length,
            totalEstimatedCost: Math.round(suggestions.reduce((s, r) => s + r.estimatedCost, 0) * 100) / 100,
            critical: suggestions.filter(s => s.urgency === 'CRITICAL').length,
            high: suggestions.filter(s => s.urgency === 'HIGH').length
        }

        return ApiResponse.success({ suggestions, summary })
    } catch (error) {
        console.error('[AUTO_REORDER_GET]', error)
        return ApiResponse.error('Failed to generate reorder suggestions')
    }
}

// POST — Generate purchase order from reorder suggestions
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Only managers+ can generate POs')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { items, supplierId, notes } = body as {
            items: { itemId: string; quantity: number }[]
            supplierId?: string
            notes?: string
        }

        if (!items || items.length === 0) return ApiResponse.badRequest('Items required')

        // Create PO
        const po = await prisma.purchaseOrder.create({
            data: {
                locationId,
                supplierId: supplierId || null,
                status: 'DRAFT',
                notes: notes || 'Auto-generated from reorder suggestions',
                items: {
                    create: items.map(item => ({
                        itemId: item.itemId,
                        quantityOrdered: item.quantity,
                        quantityReceived: 0
                    }))
                }
            },
            include: { items: true }
        })

        return ApiResponse.success({ purchaseOrder: po })
    } catch (error) {
        console.error('[AUTO_REORDER_POST]', error)
        return ApiResponse.error('Failed to create PO')
    }
}
