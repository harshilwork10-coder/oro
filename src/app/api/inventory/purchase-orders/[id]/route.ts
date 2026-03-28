import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// PUT /api/inventory/purchase-orders/[id] - Update purchase order
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const { status } = await request.json()

        // Verify the PO belongs to the user's franchise
        const existingPO = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId
            },
            include: {
                items: {
                    include: { product: true }
                }
            }
        })

        if (!existingPO) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
        }

        // ===== ATOMIC RECEIVE BLOCK =====
        const purchaseOrder = await prisma.$transaction(async (tx) => {
            // If marking as RECEIVED, update product stock
            if (status === 'RECEIVED' && existingPO.status !== 'RECEIVED') {
                // Update stock for each item
                for (const item of existingPO.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: { increment: item.quantity }
                        }
                    })

                    // Create stock adjustment record
                    await tx.stockAdjustment.create({
                        data: {
                            productId: item.productId,
                            locationId: existingPO.locationId,
                            quantity: item.quantity,
                            reason: 'RESTOCK',
                            notes: `Received from PO #${id.slice(-6).toUpperCase()}`,
                            performedBy: user.id || user.email || 'system'
                        }
                    })
                }
            }

            return await tx.purchaseOrder.update({
                where: { id },
                data: { status },
                include: {
                    supplier: true,
                    items: {
                        include: { product: true }
                    }
                }
            })
        })
        // ===== END ATOMIC BLOCK =====

        return NextResponse.json({ purchaseOrder })
    } catch (error) {
        console.error('Failed to update purchase order:', error)
        return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
    }
}

// DELETE /api/inventory/purchase-orders/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Verify the PO belongs to the user's franchise and is in DRAFT status
        const existingPO = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId,
                status: 'DRAFT'
            }
        })

        if (!existingPO) {
            return NextResponse.json({ error: 'Can only delete DRAFT purchase orders' }, { status: 400 })
        }

        // Delete items first, then the PO
        await prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id }
        })

        await prisma.purchaseOrder.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete purchase order:', error)
        return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 })
    }
}
