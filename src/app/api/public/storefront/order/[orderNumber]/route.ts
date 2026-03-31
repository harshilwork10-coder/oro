import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/storefront/order/[orderNumber] — Check order status (public)
export async function GET(
    req: NextRequest,
    { params }: { params: { orderNumber: string } }
) {
    try {
        const order = await prisma.storefrontOrder.findUnique({
            where: { orderNumber: params.orderNumber },
            include: {
                items: true,
                location: {
                    select: {
                        name: true,
                        publicName: true,
                        address: true,
                        publicPhone: true,
                        slug: true,
                        latitude: true,
                        longitude: true,
                        operatingHours: true,
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json({
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            items: order.items.map(i => ({
                name: i.itemName,
                quantity: i.quantity,
                price: Number(i.price),
                total: Number(i.total),
            })),
            subtotal: Number(order.subtotal),
            estimatedTax: Number(order.estimatedTax),
            estimatedTotal: Number(order.estimatedTotal),
            notes: order.notes,
            pickupTime: order.pickupTime,
            readyAt: order.readyAt,
            placedAt: order.createdAt,
            store: {
                name: order.location.publicName || order.location.name,
                slug: order.location.slug,
                address: order.location.address,
                phone: order.location.publicPhone,
                latitude: order.location.latitude,
                longitude: order.location.longitude,
            }
        })
    } catch (error) {
        console.error('[STOREFRONT_ORDER_STATUS_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
