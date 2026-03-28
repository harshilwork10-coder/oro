import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Waste Log — Log waste/damage/spoilage events
 * POST /api/inventory/waste-log — Log event + deduct stock
 * GET /api/inventory/waste-log — Waste report by period
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { itemId, quantity, reason, notes } = await req.json()

        if (!itemId || !quantity) return NextResponse.json({ error: 'itemId and quantity required' }, { status: 400 })
        if (!reason) return NextResponse.json({ error: 'reason required (DAMAGED, EXPIRED, STOLEN, SPOILED, OTHER)' }, { status: 400 })

        const item = await prisma.item.findFirst({ where: { id: itemId, franchiseId: user.franchiseId } })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        const costLoss = Number(item.cost || 0) * quantity
        const priceLoss = Number(item.price || 0) * quantity

        const adjustment = await prisma.stockAdjustment.create({
            data: {
                locationId: user.locationId, itemId, quantity: -Math.abs(quantity),
                reason: `WASTE: ${reason}`, notes: notes || null, adjustedBy: user.id
            }
        })

        await prisma.item.update({ where: { id: itemId }, data: { stock: { decrement: Math.abs(quantity) } } })

        return NextResponse.json({
            adjustment,
            costLoss: Math.round(costLoss * 100) / 100,
            priceLoss: Math.round(priceLoss * 100) / 100
        })
    } catch (error: any) {
        console.error('[WASTE_POST]', error)
        return NextResponse.json({ error: 'Failed to log waste' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 86400000)

    try {
        const adjustments = await prisma.stockAdjustment.findMany({
            where: { locationId: user.locationId, reason: { startsWith: 'WASTE:' }, createdAt: { gte: since } },
            include: { item: { select: { name: true, barcode: true, cost: true, price: true } } },
            orderBy: { createdAt: 'desc' }
        })

        const byReason: Record<string, number> = {}
        let totalUnits = 0, totalCostLoss = 0
        for (const a of adjustments) {
            const r = a.reason.replace('WASTE: ', '')
            byReason[r] = (byReason[r] || 0) + Math.abs(a.quantity)
            totalUnits += Math.abs(a.quantity)
            totalCostLoss += Math.abs(a.quantity) * Number(a.item?.cost || 0)
        }

        return NextResponse.json({
            adjustments, periodDays: days,
            summary: { total: adjustments.length, totalUnits, totalCostLoss: Math.round(totalCostLoss * 100) / 100, byReason }
        })
    } catch (error: any) {
        console.error('[WASTE_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch waste report' }, { status: 500 })
    }
}
