import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { badRequestResponse } from '@/lib/validation'

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
        const { originalTransactionId, refundType, items, reason, refundMethod, cashDrawerSessionId } = body

        // Enforce Open Shift Rule
        if (!cashDrawerSessionId) {
            return badRequestResponse('No open shift. Refund rejected.')
        }
        const sessionCheck = await prisma.cashDrawerSession.findUnique({
            where: { id: cashDrawerSessionId }
        })
        if (!sessionCheck || sessionCheck.endTime) {
            return badRequestResponse('Shift is closed. Cannot process refund.')
        }

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

        // Map requested refund items to actual line items and CHECK LIMITS
        // preventing double refunds (refunding same item multiple times)
        const previousRefunds = await prisma.transaction.findMany({
            where: {
                originalTransactionId: originalTx.id,
                status: 'REFUNDED'
            },
            include: { lineItems: true }
        })

        const refundLineItems = items.map((refundItem: any) => {
            const originalLineItem = originalTx.lineItems.find(li => li.id === refundItem.lineItemId)
            if (!originalLineItem) {
                throw new Error(`Line item ${refundItem.lineItemId} not found`)
            }

            // Calculate how many have already been refunded
            let previouslyRefundedQty = 0
            for (const prevRefund of previousRefunds) {
                // Find matching line item in previous refund (by product/service ID match usually, or we can assume proportional logic if tracking not explicit)
                // Since refund creates NEW line items, we must match by product/service ID or explicit reference if avail.
                // Current schema might not link refundLineItem -> originalLineItem directly.
                // Fallback: Match by productId/serviceId and price? Or just assume sequentially?
                // BETTER: The requested `refundItem` has `lineItemId` which is the ID of the line item in Original Transaction.
                // But the `previousRefunds` line items are NEW records. They don't point back to the specific original line item ID easily unless we stored it.
                // ... Inspecting schema needed?
                // Wait, if we don't link them, we can't enforce strict per-line-item limits easily.
                // BUT we can enforce verification by Product/Service ID aggregation.
                const match = prevRefund.lineItems.find(pli =>
                    (pli.productId === originalLineItem.productId && originalLineItem.productId) ||
                    (pli.serviceId === originalLineItem.serviceId && originalLineItem.serviceId)
                )
                if (match) {
                    previouslyRefundedQty += Math.abs(match.quantity) // Refund quantities are stored as negative? Check existing logic: yes "quantity: -item.quantityToRefund"
                }
            }

            // Simplified check: Use aggregation of ALL refunds for this transaction vs Original Total Items?
            // Actually, let's just protect against total quantity overflow for the specific Product/Service in this transaction.

            const totalOriginalQty = originalTx.lineItems
                .filter(li => li.productId === originalLineItem.productId && li.serviceId === originalLineItem.serviceId)
                .reduce((sum, li) => sum + li.quantity, 0)

            let totalRefundedSoFar = 0
            for (const prevRefund of previousRefunds) {
                const matches = prevRefund.lineItems.filter(pli =>
                    (pli.productId === originalLineItem.productId && originalLineItem.productId) ||
                    (pli.serviceId === originalLineItem.serviceId && originalLineItem.serviceId)
                )
                totalRefundedSoFar += matches.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
            }

            if (totalRefundedSoFar + refundItem.quantity > totalOriginalQty) {
                throw new Error(`Cannot refund ${refundItem.quantity} items. Only ${totalOriginalQty - totalRefundedSoFar} remaining for this item.`)
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

        // ===== ATOMIC TRANSACTION BLOCK =====
        // All refund operations are wrapped for rollback safety
        const refundTx = await prisma.$transaction(async (tx) => {
            // Create Refund Transaction (Negative values)
            const refundTransaction = await tx.transaction.create({
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
                    voidReason: reason || 'No reason provided',
                    cashDrawerSessionId: cashDrawerSessionId, // USE CURRENT SESSION ID
                    lineItems: {
                        create: refundItems
                    }
                }
            })

            // Update Original Transaction Status
            const allItemsRefunded = refundType === 'FULL'
            if (allItemsRefunded) {
                await tx.transaction.update({
                    where: { id: originalTx.id },
                    data: { status: 'REFUNDED' }
                })
            }

            // Restock Inventory for refunded items
            for (const refundItem of refundLineItems) {
                if (refundItem.type === 'PRODUCT' && refundItem.productId) {
                    await tx.product.update({
                        where: { id: refundItem.productId },
                        data: { stock: { increment: refundItem.quantityToRefund } }
                    })
                }
            }

            return refundTransaction
        })
        // ===== END ATOMIC TRANSACTION BLOCK =====

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

