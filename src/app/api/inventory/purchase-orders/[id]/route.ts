import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// PUT /api/inventory/purchase-orders/[id] - Update purchase order
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = params
        const { status } = await request.json()

        // Verify the PO belongs to the user's franchise
        const existingPO = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
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

        // If marking as RECEIVED, update product stock
        if (status === 'RECEIVED' && existingPO.status !== 'RECEIVED') {
            // Update stock for each item
            for (const item of existingPO.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity }
                    }
                })

                // Create stock adjustment record
                await prisma.stockAdjustment.create({
                    data: {
                        productId: item.productId,
                        locationId: existingPO.locationId,
                        quantity: item.quantity,
                        reason: 'RESTOCK',
                        notes: `Received from PO #${id.slice(-6).toUpperCase()}`,
                        performedBy: session.user.id || session.user.email || 'system'
                    }
                })
            }
        }

        const purchaseOrder = await prisma.purchaseOrder.update({
            where: { id },
            data: { status },
            include: {
                supplier: true,
                items: {
                    include: { product: true }
                }
            }
        })

        return NextResponse.json({ purchaseOrder })
    } catch (error) {
        console.error('Failed to update purchase order:', error)
        return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
    }
}

// DELETE /api/inventory/purchase-orders/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = params

        // Verify the PO belongs to the user's franchise and is in DRAFT status
        const existingPO = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId,
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
