import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/storefront-orders — Fetch pending storefront orders for POS location
// Used by POS terminal to show incoming pickup orders
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Get user's location (from session or station)
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'locationId required' }, { status: 400 })
        }

        // Fetch active storefront orders (CONFIRMED or READY)
        const orders = await prisma.storefrontOrder.findMany({
            where: {
                locationId,
                status: { in: ['PENDING', 'CONFIRMED', 'READY'] }
            },
            include: {
                items: {
                    select: {
                        itemId: true,
                        itemName: true,
                        quantity: true,
                        price: true,
                        total: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json({
            orders: orders.map(o => ({
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                status: o.status,
                estimatedTotal: Number(o.estimatedTotal),
                pickupTime: o.pickupTime,
                createdAt: o.createdAt,
                items: o.items.map(i => ({
                    itemId: i.itemId,
                    itemName: i.itemName,
                    quantity: i.quantity,
                    price: Number(i.price),
                })),
            })),
            count: orders.length,
        })
    } catch (error) {
        console.error('[POS_STOREFRONT_ORDERS_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
