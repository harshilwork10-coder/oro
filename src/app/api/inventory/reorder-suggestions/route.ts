import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * S8-06: Vendor Lead Time + Smarter Reorder Logic
 *
 * GET /api/inventory/reorder-suggestions — Smart reorder recommendations
 * POST /api/inventory/vendor-lead-time — Set vendor lead time
 *
 * Uses: Product.reorderPoint, Product.reorderQuantity, Vendor.leadTimeDays
 */
export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Get products approaching reorder point
        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                reorderPoint: { gt: 0 }
            },
            select: {
                id: true, name: true, sku: true, barcode: true,
                stock: true, reorderPoint: true,
                category: { select: { name: true } },
                vendor: { select: { id: true, name: true, leadTimeDays: true } }
            },
            orderBy: { stock: 'asc' }
        })

        const suggestions = products
            .filter(p => (p.stock || 0) <= (p.reorderPoint || 0))
            .map(p => {
                const stockLevel = p.stock || 0
                const reorderPoint = p.reorderPoint || 0
                const reorderQty = (p.reorderPoint || 1) * 2  // Default: 2x reorder point
                const leadDays = p.vendor?.leadTimeDays || 3

                // Calculate urgency based on stock vs reorder point ratio
                const stockRatio = reorderPoint > 0 ? stockLevel / reorderPoint : 0
                const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
                    stockLevel === 0 ? 'CRITICAL' :
                        stockRatio <= 0.25 ? 'HIGH' :
                            stockRatio <= 0.5 ? 'MEDIUM' : 'LOW'

                // Estimated days until stockout (rough: dailyUsage ≈ reorderQty / 30)
                const estimatedDailyUsage = reorderQty / 30
                const daysUntilOut = estimatedDailyUsage > 0 ? Math.floor(stockLevel / estimatedDailyUsage) : 999
                const needsUrgentOrder = daysUntilOut <= leadDays

                return {
                    productId: p.id, name: p.name, sku: p.sku, barcode: p.barcode,
                    category: p.category?.name,
                    currentStock: stockLevel,
                    reorderPoint, reorderQuantity: reorderQty,
                    vendor: p.vendor?.name || 'No vendor',
                    vendorId: p.vendor?.id,
                    leadTimeDays: leadDays,
                    urgency,
                    daysUntilStockout: daysUntilOut,
                    needsUrgentOrder,
                    suggestedOrderDate: needsUrgentOrder ? 'NOW' : new Date(Date.now() + (daysUntilOut - leadDays) * 86400000).toLocaleDateString()
                }
            })

        // Group by urgency
        const byCritical = suggestions.filter(s => s.urgency === 'CRITICAL').length
        const byHigh = suggestions.filter(s => s.urgency === 'HIGH').length

        return NextResponse.json({
            suggestions,
            summary: {
                total: suggestions.length,
                critical: byCritical,
                high: byHigh,
                needsUrgentOrder: suggestions.filter(s => s.needsUrgentOrder).length,
                vendorsInvolved: [...new Set(suggestions.map(s => s.vendor))].length
            }
        })
    } catch (error: any) {
        console.error('[REORDER_SUGGESTIONS_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { vendorId, leadTimeDays } = body

        if (!vendorId || leadTimeDays == null) {
            return NextResponse.json({ error: 'vendorId and leadTimeDays required' }, { status: 400 })
        }

        await prisma.vendor.update({
            where: { id: vendorId },
            data: { leadTimeDays }
        })

        return NextResponse.json({ success: true, vendorId, leadTimeDays })
    } catch (error: any) {
        console.error('[VENDOR_LEAD_TIME_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
    }
}
