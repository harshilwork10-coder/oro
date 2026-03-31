import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/storefront/orders — List storefront orders for user's location
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        const franchise = user.franchiseId
            ? await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                include: { locations: { select: { id: true }, take: 1 } }
            })
            : null

        if (!franchise?.locations?.[0]) {
            return NextResponse.json({ error: 'No location found' }, { status: 404 })
        }

        const locationId = franchise.locations[0].id

        const where: any = { locationId }
        if (status) where.status = status

        const orders = await prisma.storefrontOrder.findMany({
            where,
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })

        return NextResponse.json({
            orders: orders.map(o => ({
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                status: o.status,
                subtotal: Number(o.subtotal),
                estimatedTotal: Number(o.estimatedTotal),
                notes: o.notes,
                pickupTime: o.pickupTime,
                readyAt: o.readyAt,
                createdAt: o.createdAt,
                items: o.items.map(i => ({
                    id: i.id,
                    itemId: i.itemId,
                    itemName: i.itemName,
                    quantity: i.quantity,
                    price: Number(i.price),
                    total: Number(i.total),
                })),
            }))
        })
    } catch (error) {
        console.error('[STOREFRONT_ORDERS_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
