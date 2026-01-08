import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/inventory/smart-ordering
// Returns AI-powered reorder suggestions based on stock levels and sales velocity
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        // Get locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        })

        // Get all active products with their stock info
        const products = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true
            },
            include: {
                suppliers: {
                    include: { supplier: true }
                }
            }
        })

        // Calculate sales velocity from recent transactions (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentSales = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                transaction: {
                    franchiseId,
                    createdAt: { gte: thirtyDaysAgo },
                    status: 'COMPLETED'
                }
            },
            _sum: { quantity: true }
        })

        // Build velocity map
        const velocityMap: Record<string, number> = {}
        for (const sale of recentSales) {
            if (sale.productId) {
                velocityMap[sale.productId] = (sale._sum.quantity || 0) / 30 // Daily velocity
            }
        }

        // Identify products needing reorder
        const reorderItems: any[] = []

        for (const product of products) {
            const stock = product.stock || 0
            const reorderPoint = product.reorderPoint || 5
            const velocity = velocityMap[product.id] || 0.1 // Default low velocity

            // Skip if above reorder point
            if (stock > reorderPoint) continue

            // Calculate days until stockout
            const daysUntilStockout = velocity > 0 ? Math.floor(stock / velocity) : null

            // Calculate suggested order quantity
            const maxStock = product.maxStock || (reorderPoint * 3)
            const suggestedQty = Math.max(maxStock - stock, reorderPoint)

            // Determine urgency
            let urgency: 'critical' | 'high' | 'normal' = 'normal'
            if (stock === 0 || (daysUntilStockout !== null && daysUntilStockout <= 3)) {
                urgency = 'critical'
            } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
                urgency = 'high'
            }

            // Get supplier info
            const primarySupplier = product.suppliers[0]?.supplier

            reorderItems.push({
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                sku: product.sku,
                currentStock: stock,
                reorderPoint,
                suggestedQty,
                cost: product.cost ? Number(product.cost) : 0,
                supplier: primarySupplier?.name || 'Unknown',
                supplierId: primarySupplier?.id || null,
                daysUntilStockout,
                velocity: Math.round(velocity * 10) / 10,
                urgency,
                locationName: 'Main'
            })
        }

        // Group by supplier for suggested orders
        const supplierGroups: Record<string, typeof reorderItems> = {}
        for (const item of reorderItems) {
            const key = item.supplierId || 'unknown'
            if (!supplierGroups[key]) {
                supplierGroups[key] = []
            }
            supplierGroups[key].push(item)
        }

        // Build suggested orders
        const suggestedOrders = Object.entries(supplierGroups).map(([supplierId, items]) => {
            // Determine overall urgency
            let urgency: 'critical' | 'high' | 'normal' = 'normal'
            if (items.some(i => i.urgency === 'critical')) {
                urgency = 'critical'
            } else if (items.some(i => i.urgency === 'high')) {
                urgency = 'high'
            }

            const totalCost = items.reduce((sum, item) => sum + (item.suggestedQty * item.cost), 0)

            return {
                supplierId: supplierId === 'unknown' ? null : supplierId,
                supplierName: items[0]?.supplier || 'General Supplier',
                items: items.sort((a, b) => {
                    // Sort by urgency then days until stockout
                    if (a.urgency !== b.urgency) {
                        const urgencyOrder: Record<string, number> = { critical: 0, high: 1, normal: 2 }
                        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
                    }
                    return (a.daysUntilStockout || 999) - (b.daysUntilStockout || 999)
                }),
                totalItems: items.length,
                totalCost,
                urgency
            }
        }).sort((a, b) => {
            // Sort orders by urgency
            const urgencyOrder = { critical: 0, high: 1, normal: 2 }
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        })

        // Get recent purchase orders
        const recentOrders = await prisma.purchaseOrder.findMany({
            where: { franchiseId },
            include: {
                supplier: { select: { name: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })

        // Count critical and warning items
        const criticalCount = reorderItems.filter(i => i.urgency === 'critical').length
        const warningCount = reorderItems.filter(i => i.urgency === 'high' || i.urgency === 'normal').length

        return NextResponse.json({
            criticalCount,
            warningCount,
            suggestedOrders,
            recentOrders: recentOrders.map(o => ({
                id: o.id,
                supplier: o.supplier?.name || 'Unknown',
                status: o.status,
                itemCount: o._count.items,
                totalCost: Number(o.totalCost),
                createdAt: o.createdAt.toISOString()
            })),
            locations
        })

    } catch (error) {
        console.error('Smart ordering error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

