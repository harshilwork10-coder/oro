import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Create a refund transaction
        const refundTransaction = await prisma.transaction.create({
            data: {
                franchiseId: transaction.franchiseId,
                employeeId: transaction.employeeId,
                clientId: transaction.clientId,
                type: 'REFUND',
                status: 'COMPLETED',
                paymentMethod: transaction.paymentMethod,
                subtotal: -refundAmount,
                tax: -Number(transaction.tax),
                tip: 0,
                discount: 0,
                cardFee: 0,
                total: -(refundAmount + Number(transaction.tax)),
                invoiceNumber: `REFUND-${transaction.invoiceNumber}`,
                notes: `Refund for transaction ${transaction.id}`,
                lineItems: {
                    create: itemsToRefund.map(item => ({
                        type: item.type,
                        serviceId: item.serviceId,
                        productId: item.productId,
                        staffId: item.staffId,
                        quantity: item.quantity,
                        price: item.price,
                        total: -Number(item.total)
                    }))
                }
            }
        })

        // Mark original transaction as refunded if full refund
        if (items.length === 0 || items.length === transaction.lineItems.length) {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'REFUNDED' }
            })
        }

        return NextResponse.json({ success: true, refundId: refundTransaction.id })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_REFUND]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
