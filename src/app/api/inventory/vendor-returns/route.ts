import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Vendor Returns / RMA — Create and list vendor returns
 * POST /api/inventory/vendor-returns — Create return
 * GET /api/inventory/vendor-returns — List returns
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { supplierId, items, reason, notes } = await req.json() as {
            supplierId: string; items: { itemId: string; quantity: number; reason?: string }[]; reason: string; notes?: string
        }
        if (!supplierId || !items?.length || !reason) return NextResponse.json({ error: 'supplierId, items, and reason required' }, { status: 400 })

        const rma = await prisma.purchaseOrder.create({
            data: {
                locationId: user.locationId, supplierId, status: 'RETURN',
                notes: JSON.stringify({ reason, notes: notes || null, returnedBy: user.name || user.email, returnDate: new Date() }),
                items: { create: items.map(i => ({ itemId: i.itemId, quantityOrdered: 0, quantityReceived: -Math.abs(i.quantity) })) }
            },
            include: { items: { include: { item: { select: { name: true, cost: true } } } }, supplier: { select: { name: true } } }
        })

        let totalCredit = 0
        for (const item of items) {
            const dbItem = await prisma.item.findFirst({ where: { id: item.itemId } })
            if (dbItem) {
                await prisma.item.update({ where: { id: item.itemId }, data: { stock: { decrement: Math.abs(item.quantity) } } })
                totalCredit += Math.abs(item.quantity) * Number(dbItem.cost || 0)
            }
        }

        return NextResponse.json({ rma, totalCredit: Math.round(totalCredit * 100) / 100, message: `Return created. Expected vendor credit: $${totalCredit.toFixed(2)}` })
    } catch (error: any) {
        console.error('[VENDOR_RETURN_POST]', error)
        return NextResponse.json({ error: 'Failed to create vendor return' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const returns = await prisma.purchaseOrder.findMany({
            where: { locationId: user.locationId, status: 'RETURN' },
            include: { items: { include: { item: { select: { name: true, cost: true } } } }, supplier: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }, take: 50
        })
        return NextResponse.json({ returns })
    } catch (error: any) {
        console.error('[VENDOR_RETURN_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 })
    }
}
