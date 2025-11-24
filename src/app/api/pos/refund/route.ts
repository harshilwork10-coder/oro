import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { originalTransactionId, items, reason } = body

        // Fetch original transaction
        const originalTx = await prisma.transaction.findUnique({
            where: { id: originalTransactionId },
            include: { lineItems: true }
        })

        if (!originalTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Calculate refund totals
        let refundSubtotal = 0
        let refundTax = 0
        let refundTotal = 0

        // Create Refund Transaction (Negative values)
        const refundTx = await prisma.transaction.create({
            data: {
                franchiseId: session.user.franchiseId,
                clientId: originalTx.clientId,
                employeeId: session.user.id,
                originalTransactionId: originalTx.id,
                status: 'REFUNDED',
                paymentMethod: originalTx.paymentMethod, // Refund to same method
                subtotal: 0, // Calculated below
                tax: 0,
                total: 0,
                lineItems: {
                    create: items.map((item: any) => {
                        const lineTotal = item.price * item.quantity
                        refundSubtotal += lineTotal
                        return {
                            type: item.type,
                            serviceId: item.serviceId,
                            productId: item.productId,
                            quantity: -item.quantity, // Negative quantity
                            price: item.price,
                            total: -lineTotal // Negative total
                        }
                    })
                }
            }
        })

        // Calculate tax proportion (simplified)
        // In real world, we'd recalculate tax exactly based on refunded items
        const taxRate = Number(originalTx.tax) / Number(originalTx.subtotal)
        refundTax = refundSubtotal * (isNaN(taxRate) ? 0 : taxRate)
        refundTotal = refundSubtotal + refundTax

        // Update the refund transaction with calculated totals (negative)
        await prisma.transaction.update({
            where: { id: refundTx.id },
            data: {
                subtotal: -refundSubtotal,
                tax: -refundTax,
                total: -refundTotal
            }
        })

        // Restock Inventory
        for (const item of items) {
            if (item.type === 'PRODUCT' && item.productId) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                })
            }
        }

        return NextResponse.json(refundTx)
    } catch (error) {
        console.error('[POS_REFUND_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
