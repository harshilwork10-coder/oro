import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Auto-Reorder — Items below par level + PO generation
 * GET /api/inventory/auto-reorder — Suggestions
 * POST /api/inventory/auto-reorder — Generate PO from suggestions (Manager+)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const items = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true, parLevel: { not: null } },
            select: {
                id: true, name: true, barcode: true, sku: true, stock: true, cost: true,
                parLevel: true, autoReorderQty: true, preferredSupplierId: true, reorderPoint: true,
                category: { select: { name: true } }
            }
        })

        const suggestions = items
            .filter(item => (item.stock || 0) < (item.parLevel || 0))
            .map(item => {
                const stock = item.stock || 0, par = item.parLevel || 0
                const deficit = par - stock, orderQty = item.autoReorderQty || deficit
                return {
                    itemId: item.id, name: item.name, barcode: item.barcode, sku: item.sku,
                    category: item.category?.name || 'Uncategorized',
                    currentStock: stock, parLevel: par, deficit, suggestedOrderQty: orderQty,
                    estimatedCost: Math.round(orderQty * Number(item.cost || 0) * 100) / 100,
                    preferredSupplierId: item.preferredSupplierId,
                    urgency: stock === 0 ? 'CRITICAL' : stock <= (item.reorderPoint || 0) ? 'HIGH' : 'NORMAL'
                }
            })
            .sort((a, b) => {
                const o = { CRITICAL: 0, HIGH: 1, NORMAL: 2 } as any
                return (o[a.urgency] || 2) - (o[b.urgency] || 2)
            })

        return NextResponse.json({
            suggestions,
            summary: {
                totalItems: suggestions.length,
                totalEstimatedCost: Math.round(suggestions.reduce((s, r) => s + r.estimatedCost, 0) * 100) / 100,
                critical: suggestions.filter(s => s.urgency === 'CRITICAL').length,
                high: suggestions.filter(s => s.urgency === 'HIGH').length
            }
        })
    } catch (error: any) {
        console.error('[AUTO_REORDER_GET]', error)
        return NextResponse.json({ error: 'Failed to generate reorder suggestions' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
    }

    try {
        const { items, supplierId, notes } = await req.json() as {
            items: { itemId: string; quantity: number }[]; supplierId?: string; notes?: string
        }
        if (!items?.length) return NextResponse.json({ error: 'Items required' }, { status: 400 })

        const po = await prisma.purchaseOrder.create({
            data: {
                locationId: user.locationId, supplierId: supplierId || null, status: 'DRAFT',
                notes: notes || 'Auto-generated from reorder suggestions',
                items: { create: items.map(item => ({ itemId: item.itemId, quantityOrdered: item.quantity, quantityReceived: 0 })) }
            },
            include: { items: true }
        })

        return NextResponse.json({ purchaseOrder: po })
    } catch (error: any) {
        console.error('[AUTO_REORDER_POST]', error)
        return NextResponse.json({ error: 'Failed to create PO' }, { status: 500 })
    }
}
