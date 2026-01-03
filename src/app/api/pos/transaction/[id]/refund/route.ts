import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params
        const transactionId = id
        const { items } = await req.json()

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // SECURITY: Verify transaction belongs to user's franchise
        if (transaction.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: 'Can only refund completed transactions'
            }, { status: 400 })
        }

        // Calculate refund amount based on selected items
        const itemsToRefund = items && items.length > 0
            ? transaction.lineItems.filter(item => items.includes(item.id))
            : transaction.lineItems

        const refundAmount = itemsToRefund.reduce((sum, item) => sum + Number(item.total), 0)
        const isFullRefund = items.length === 0 || items.length === transaction.lineItems.length

        // ===== ATOMIC TRANSACTION BLOCK =====
        const refundTransaction = await prisma.$transaction(async (tx) => {
            // Create a refund transaction (linked to original via originalTransactionId)
            const refund = await tx.transaction.create({
                data: {
                    franchiseId: transaction.franchiseId,
                    employeeId: user.id, // Use current user, not original employee
                    clientId: transaction.clientId,
                    originalTransactionId: transactionId,
                    status: 'COMPLETED',
                    paymentMethod: transaction.paymentMethod,
                    subtotal: -refundAmount,
                    tax: -Number(transaction.tax),
                    tip: 0,
                    discount: 0,
                    cardFee: 0,
                    total: -(refundAmount + Number(transaction.tax)),
                    invoiceNumber: `REFUND-${transaction.invoiceNumber}`,
                    voidReason: 'Item refund',
                    lineItems: {
                        create: itemsToRefund.map(item => ({
                            type: item.type,
                            serviceId: item.serviceId,
                            productId: item.productId,
                            staffId: item.staffId,
                            quantity: -item.quantity, // Negative for refund
                            price: item.price,
                            total: -Number(item.total)
                        }))
                    }
                }
            })

            // Mark original transaction as refunded if full refund
            if (isFullRefund) {
                await tx.transaction.update({
                    where: { id: transactionId },
                    data: { status: 'REFUNDED' }
                })
            }

            // Restock inventory for refunded product items
            for (const item of itemsToRefund) {
                if (item.type === 'PRODUCT' && item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    })
                }
            }

            return refund
        })
        // ===== END ATOMIC TRANSACTION BLOCK =====

        // ===== AUDIT LOG =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.REFUND_PROCESSED,
            entityType: 'REFUND',
            entityId: refundTransaction.id,
            details: {
                originalTransactionId: transactionId,
                refundTotal: refundAmount,
                isFullRefund,
                itemsRefunded: itemsToRefund.length
            }
        })

        return NextResponse.json({ success: true, refundId: refundTransaction.id })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_REFUND]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
