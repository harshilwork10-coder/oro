import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Consignment — Record and list consignment inventory
 * POST /api/inventory/consignment — Record consignment receipt
 * GET /api/inventory/consignment — List consignment POs
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { supplierId, items, terms, notes } = await req.json() as {
            supplierId: string; items: { itemId: string; quantity: number; costPerUnit: number }[]; terms?: string; notes?: string
        }
        if (!supplierId || !items?.length) return NextResponse.json({ error: 'supplierId and items required' }, { status: 400 })

        const po = await prisma.purchaseOrder.create({
            data: {
                locationId: user.locationId, supplierId, status: 'CONSIGNMENT',
                notes: JSON.stringify({ terms: terms || 'Pay on sale', notes }),
                items: { create: items.map(i => ({ itemId: i.itemId, quantityOrdered: i.quantity, quantityReceived: i.quantity, unitCost: i.costPerUnit })) }
            },
            include: { items: true }
        })

        for (const item of items) {
            await prisma.item.update({ where: { id: item.itemId }, data: { stock: { increment: item.quantity } } })
        }

        return NextResponse.json({ consignment: po })
    } catch (error: any) {
        console.error('[CONSIGNMENT_POST]', error)
        return NextResponse.json({ error: 'Failed to record consignment' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const consignments = await prisma.purchaseOrder.findMany({
            where: { locationId: user.locationId, status: 'CONSIGNMENT' },
            include: { items: { include: { item: { select: { name: true, barcode: true, stock: true } } } }, supplier: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ consignments })
    } catch (error: any) {
        console.error('[CONSIGNMENT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch consignments' }, { status: 500 })
    }
}
