import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: Only users with refund permission or franchise owners
    if (!user.canProcessRefunds && user.role !== 'FRANCHISOR') {
        return NextResponse.json({ error: 'Permission denied: Cannot process refunds' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { originalTransactionId, refundType, items, reason, refundMethod } = body

        // Fetch original transaction with line items
        const originalTx = await prisma.transaction.findUnique({
            where: { id: originalTransactionId },
            include: { lineItems: true }
        })

        if (!originalTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Security: Verify transaction belongs to user's franchise
        if (originalTx.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (originalTx.status !== 'COMPLETED') {
            return NextResponse.json({
                error: `Cannot refund transaction with status: ${originalTx.status}`
            }, { status: 400 })
        }

        // Map requested refund items to actual line items
        const refundLineItems = items.map((refundItem: any) => {
            const originalLineItem = originalTx.lineItems.find(li => li.id === refundItem.lineItemId)
            if (!originalLineItem) {
                throw new Error(`Line item ${refundItem.lineItemId} not found`)
            }
            return {
                ...originalLineItem,
                quantityToRefund: refundItem.quantity
            }
        })

        // Calculate refund totals
        let refundSubtotal = 0
        const refundItems = refundLineItems.map((item: any) => {
            const itemTotal = item.price * item.quantityToRefund * (1 - (item.discount || 0) / 100)
            refundSubtotal += itemTotal
            return {
                type: item.type,
                serviceId: item.serviceId,
                productId: item.productId,
                quantity: -item.quantityToRefund, // Negative quantity for refund
                price: item.price,
                discount: item.discount || 0,
                total: -itemTotal // Negative total for refund
            }
        })

        // Calculate proportional tax
        const taxRate = Number(originalTx.tax) / Number(originalTx.subtotal)
        const refundTax = refundSubtotal * (isNaN(taxRate) ? 0 : taxRate)
        const refundTotal = refundSubtotal + refundTax

        // Create Refund Transaction (Negative values)
        const refundTx = await prisma.transaction.create({
            data: {
                franchiseId: user.franchiseId,
                clientId: originalTx.clientId,
                employeeId: user.id,
                originalTransactionId: originalTx.id,
                status: 'REFUNDED',
                paymentMethod: refundMethod || originalTx.paymentMethod,
                subtotal: -refundSubtotal,
                tax: -refundTax,
                total: -refundTotal,
                voidReason: reason || 'No reason provided', // Store refund reason for audit
                cashDrawerSessionId: originalTx.cashDrawerSessionId,
                lineItems: {
                    create: refundItems
                }
            }
        })

        // Update Original Transaction Status
        // Only mark as REFUNDED if all items were refunded
        const allItemsRefunded = refundType === 'FULL'
        if (allItemsRefunded) {
            await prisma.transaction.update({
                where: { id: originalTx.id },
                data: { status: 'REFUNDED' }
            })
        }

        // Restock Inventory for refunded items
        for (const refundItem of refundLineItems) {
            if (refundItem.type === 'PRODUCT' && refundItem.productId) {
                await prisma.product.update({
                    where: { id: refundItem.productId },
                    data: { stock: { increment: refundItem.quantityToRefund } }
                })
            }
        }

        // ===== AUDIT LOG - Record this refund for legal protection =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.REFUND_PROCESSED,
            entityType: 'REFUND',
            entityId: refundTx.id,
            details: {
                originalTransactionId,
                refundType,
                refundTotal,
                refundMethod: refundMethod || originalTx.paymentMethod,
                reason: reason || 'No reason provided',
                itemsRefunded: items.length
            }
        })
        // =============================================================

        return NextResponse.json(refundTx)
    } catch (error) {
        console.error('[POS_REFUND_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
