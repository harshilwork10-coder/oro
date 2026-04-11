import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/pos/stock-transfer/[id] — Get transfer detail
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const transfer = await prisma.inventoryTransfer.findUnique({
        where: { id: params.id },
        include: {
            items: { include: { item: { select: { name: true, sku: true, barcode: true } } } },
            fromLocation: { select: { name: true } },
            toLocation: { select: { name: true } }
        }
    })
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(transfer)
}

/**
 * PATCH /api/pos/stock-transfer/[id] — Update transfer status
 * Body: { action: 'APPROVE' | 'SHIP' | 'RECEIVE' | 'CANCEL', items?: [{ id, quantityReceived, discrepancyNote? }], notes? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, items: receivedItems, notes } = body

        const transfer = await prisma.inventoryTransfer.findUnique({
            where: { id: params.id },
            include: { items: true }
        })
        if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        // State machine
        const transitions: Record<string, { from: string[], to: string }> = {
            APPROVE: { from: ['PENDING'], to: 'APPROVED' },
            SHIP: { from: ['APPROVED'], to: 'IN_TRANSIT' },
            RECEIVE: { from: ['IN_TRANSIT', 'APPROVED'], to: 'RECEIVED' },
            CANCEL: { from: ['PENDING', 'APPROVED'], to: 'CANCELLED' }
        }

        const transition = transitions[action]
        if (!transition) return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
        if (!transition.from.includes(transfer.status)) {
            return NextResponse.json({ error: `Cannot ${action} a ${transfer.status} transfer` }, { status: 400 })
        }

        // Build update data
        const updateData: any = { status: transition.to }
        if (notes) updateData.notes = `${transfer.notes || ''}\n[${action}] ${notes}`

        if (action === 'APPROVE') {
            updateData.approvedById = user.id
            updateData.approvedByName = user.name || user.email
            updateData.approvedAt = new Date()
        }
        if (action === 'SHIP') {
            updateData.shippedById = user.id
            updateData.shippedByName = user.name || user.email
            updateData.shippedAt = new Date()

            // Decrement source inventory on ship
            for (const item of transfer.items) {
                await prisma.product.update({
                    where: { id: item.itemId },
                    data: { stock: { decrement: item.quantitySent } }
                }).catch(() => {})

                await prisma.stockAdjustment.create({
                    data: {
                        productId: item.itemId,
                        locationId: transfer.fromLocationId,
                        quantity: -item.quantitySent,
                        reason: 'TRANSFER',
                        notes: `Transfer OUT to ${transfer.toLocationId}`,
                        sourceId: transfer.id,
                        performedBy: user.id
                    }
                })
            }
        }
        if (action === 'RECEIVE') {
            updateData.receivedById = user.id
            updateData.receivedByName = user.name || user.email
            updateData.receivedAt = new Date()

            // Update received quantities + increment destination inventory
            let hasDiscrepancy = false
            for (const item of transfer.items) {
                const received = receivedItems?.find((ri: any) => ri.id === item.id)
                const qtyReceived = received?.quantityReceived ?? item.quantitySent
                const discrepancy = received?.discrepancyNote || null

                if (qtyReceived !== item.quantitySent) hasDiscrepancy = true

                await prisma.transferItem.update({
                    where: { id: item.id },
                    data: { quantityReceived: qtyReceived, discrepancyNote: discrepancy }
                })

                // Increment destination inventory
                await prisma.product.update({
                    where: { id: item.itemId },
                    data: { stock: { increment: qtyReceived } }
                }).catch(() => {})

                await prisma.stockAdjustment.create({
                    data: {
                        productId: item.itemId,
                        locationId: transfer.toLocationId,
                        quantity: qtyReceived,
                        reason: 'TRANSFER',
                        notes: `Transfer IN from ${transfer.fromLocationId}`,
                        sourceId: transfer.id,
                        performedBy: user.id
                    }
                })
            }
            if (hasDiscrepancy) updateData.status = 'DISCREPANCY'
        }

        const updated = await prisma.inventoryTransfer.update({
            where: { id: params.id },
            data: updateData,
            include: { items: true }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: `TRANSFER_${action}`, entityType: 'InventoryTransfer', entityId: params.id,
            details: { previousStatus: transfer.status, newStatus: updateData.status }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('[STOCK_TRANSFER_PATCH]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
