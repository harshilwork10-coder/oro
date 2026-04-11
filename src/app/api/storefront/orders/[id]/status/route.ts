import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// PUT /api/storefront/orders/[id]/status — Update order status
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { status } = body

        // Validate status transition
        const validStatuses = ['CONFIRMED', 'READY', 'PICKED_UP', 'CANCELLED']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const order = await prisma.storefrontOrder.findUnique({
            where: { id: resolvedParams.id },
            select: { id: true, status: true, locationId: true }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Validate transitions
        const validTransitions: Record<string, string[]> = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['READY', 'CANCELLED'],
            READY: ['PICKED_UP', 'CANCELLED'],
        }

        const allowed = validTransitions[order.status]
        if (!allowed || !allowed.includes(status)) {
            return NextResponse.json({
                error: `Cannot change status from ${order.status} to ${status}`
            }, { status: 400 })
        }

        // Build update data
        const updateData: any = { status }
        if (status === 'READY') updateData.readyAt = new Date()
        if (status === 'PICKED_UP') updateData.pickedUpAt = new Date()

        const updated = await prisma.storefrontOrder.update({
            where: { id: resolvedParams.id },
            data: updateData,
        })

        return NextResponse.json({ order: updated })
    } catch (error) {
        console.error('[STOREFRONT_ORDER_STATUS_PUT]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
