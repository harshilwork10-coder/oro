import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Pre-Order — Create and list pre-orders stored as suspended transactions */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { itemId, customerId, customerName, customerPhone, quantity, depositAmount, notes } = await req.json()
        if (!itemId || !quantity) return NextResponse.json({ error: 'itemId and quantity required' }, { status: 400 })
        const item = await prisma.item.findFirst({ where: { id: itemId, franchiseId: user.franchiseId } })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        const preorder = await prisma.suspendedTransaction.create({
            data: {
                locationId: user.locationId, cashierId: user.id, label: `PRE-ORDER: ${item.name} x${quantity}`,
                cartData: JSON.stringify({ type: 'PRE_ORDER', itemId, itemName: item.name, quantity, unitPrice: Number(item.price), total: Number(item.price) * quantity, customerId, customerName, customerPhone, depositAmount: depositAmount || 0, notes, status: 'WAITING' }),
                status: 'PRE_ORDER', expiresAt: new Date(Date.now() + 90 * 86400000)
            }
        })
        return NextResponse.json({ preorderId: preorder.id, itemName: item.name, total: Number(item.price) * quantity, depositPaid: depositAmount || 0, balanceDue: (Number(item.price) * quantity) - (depositAmount || 0) })
    } catch (error: any) { console.error('[PREORDER_POST]', error); return NextResponse.json({ error: 'Failed to create pre-order' }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const preorders = await prisma.suspendedTransaction.findMany({ where: { locationId: user.locationId, status: 'PRE_ORDER' }, orderBy: { createdAt: 'desc' } })
        const parsed = preorders.map((po: any) => ({ id: po.id, label: po.label, data: JSON.parse(po.cartData || '{}'), createdAt: po.createdAt, expiresAt: po.expiresAt }))
        return NextResponse.json({ preorders: parsed })
    } catch (error: any) { console.error('[PREORDER_GET]', error); return NextResponse.json({ error: 'Failed to fetch pre-orders' }, { status: 500 }) }
}
