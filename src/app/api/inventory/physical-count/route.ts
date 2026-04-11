import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Physical Count — Inventory count sessions
 * POST /api/inventory/physical-count — Submit count + reconcile
 * GET /api/inventory/physical-count — Get items to count
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { items, categoryId, notes } = await req.json()
        if (!items?.length) return NextResponse.json({ error: 'Items with counted quantities required' }, { status: 400 })

        const results = []
        let totalVariance = 0
        let totalCostVariance = 0

        for (const counted of items) {
            const item = await prisma.item.findFirst({ where: { id: counted.itemId, franchiseId: user.franchiseId } })
            if (!item) continue

            const systemQty = item.stock || 0
            const countedQty = counted.countedQty || 0
            const variance = countedQty - systemQty
            const costVariance = variance * Number(item.cost || 0)

            results.push({
                itemId: item.id, name: item.name, barcode: item.barcode,
                systemQty, countedQty, variance,
                costVariance: Math.round(costVariance * 100) / 100
            })

            totalVariance += Math.abs(variance)
            totalCostVariance += costVariance

            if (variance !== 0) {
                await prisma.stockAdjustment.create({
                    data: {
                        locationId: user.locationId, itemId: item.id, quantity: variance,
                        reason: 'PHYSICAL_COUNT',
                        notes: notes || `Physical count: system=${systemQty}, counted=${countedQty}`,
                        adjustedBy: user.id
                    }
                })
                await prisma.item.update({ where: { id: item.id }, data: { stock: countedQty } })
            }
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'PHYSICAL_COUNT', entityType: 'Inventory', entityId: user.locationId,
            details: { categoryId, itemCount: items.length, totalVariance, totalCostVariance: Math.round(totalCostVariance * 100) / 100 }
        })

        return NextResponse.json({
            results,
            summary: {
                itemsCounted: results.length,
                itemsWithVariance: results.filter(r => r.variance !== 0).length,
                totalVarianceUnits: totalVariance,
                totalCostVariance: Math.round(totalCostVariance * 100) / 100
            }
        })
    } catch (error: any) {
        console.error('[PHYSICAL_COUNT_POST]', error)
        return NextResponse.json({ error: 'Failed to process count' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    try {
        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true }
        if (categoryId) where.categoryId = categoryId

        const items = await prisma.item.findMany({
            where, select: { id: true, name: true, barcode: true, sku: true, stock: true, cost: true, category: { select: { name: true } } },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ items })
    } catch (error: any) {
        console.error('[PHYSICAL_COUNT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}
