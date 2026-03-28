import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Delivery/Pickup Orders
 * POST — Create order | GET — List pending | PUT — Update status
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { type, customerName, customerPhone, customerAddress, items, scheduledTime, notes } = await req.json()
        if (!type || !items?.length) return NextResponse.json({ error: 'type and items required' }, { status: 400 })
        if (type === 'DELIVERY' && !customerAddress) return NextResponse.json({ error: 'Address required for delivery' }, { status: 400 })

        const total = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0)
        const order = await prisma.transaction.create({
            data: {
                locationId: user.locationId, employeeId: user.id,
                type: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP', status: 'ORDER_PLACED',
                subtotal: total, total, paymentMethod: 'PENDING',
                notes: JSON.stringify({ customerName, customerPhone, customerAddress, scheduledTime, notes, orderType: type, statusHistory: [{ status: 'ORDER_PLACED', time: new Date(), by: user.name }] }),
                items: { create: items.map((i: any) => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unitPrice: i.price, total: i.price * i.quantity })) }
            }
        })
        return NextResponse.json({ order: { id: order.id, type, total: Math.round(total * 100) / 100, status: 'ORDER_PLACED' } })
    } catch (error: any) { console.error('[ORDER_POST]', error); return NextResponse.json({ error: 'Failed to create order' }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    try {
        const where: any = { locationId: user.locationId, status: { in: ['ORDER_PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } }
        if (type) where.type = type
        const orders = await prisma.transaction.findMany({ where, include: { items: { select: { name: true, quantity: true, unitPrice: true, total: true } }, employee: { select: { name: true } } }, orderBy: { createdAt: 'asc' } })
        return NextResponse.json({ orders })
    } catch (error: any) { console.error('[ORDER_GET]', error); return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { orderId, status } = await req.json()
        if (!orderId || !status) return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })
        const valid = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
        if (!valid.includes(status)) return NextResponse.json({ error: `Invalid status. Use: ${valid.join(', ')}` }, { status: 400 })
        const order = await prisma.transaction.findFirst({ where: { id: orderId } })
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        const orderData = JSON.parse(order.notes || '{}')
        orderData.statusHistory = orderData.statusHistory || []
        orderData.statusHistory.push({ status, time: new Date(), by: user.name })
        await prisma.transaction.update({ where: { id: orderId }, data: { status, notes: JSON.stringify(orderData) } })
        return NextResponse.json({ orderId, status })
    } catch (error: any) { console.error('[ORDER_PUT]', error); return NextResponse.json({ error: 'Failed to update order' }, { status: 500 }) }
}
