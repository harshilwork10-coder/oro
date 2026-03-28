import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET /api/pos/transactions/lookup - Lookup transaction by invoice number for refunds
// This enables the "scan receipt barcode" feature for quick refunds
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const invoiceNumber = searchParams.get('invoice')
        const transactionId = searchParams.get('id')

        if (!invoiceNumber && !transactionId) {
            return NextResponse.json({ error: 'Invoice number or transaction ID is required' }, { status: 422 })
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId
        }

        if (invoiceNumber) {
            whereClause.invoiceNumber = invoiceNumber
        } else if (transactionId) {
            whereClause.id = transactionId
        }

        // Find the transaction with related data
        const transaction = await prisma.transaction.findFirst({
            where: whereClause,
            include: {
                lineItems: true,
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true, phone: true } }
            }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction' }, { status: 404 })
        }

        // Format for refund display
        const refundData = {
            id: transaction.id,
            invoiceNumber: transaction.invoiceNumber,
            createdAt: transaction.createdAt,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            total: transaction.total,
            paymentMethod: transaction.paymentMethod,
            status: transaction.status,
            employee: transaction.employee?.name || null,
            customer: transaction.client
                ? `${transaction.client.firstName} ${transaction.client.lastName}`
                : null,
            customerPhone: transaction.client?.phone || null,
            items: (transaction.lineItems as any[]).map((item: any) => ({
                id: item.id,
                name: item.name || 'Unknown',
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: Number(item.price) * item.quantity * (1 - (Number(item.discount) || 0) / 100)
            })),
            refundable: transaction.status !== 'REFUNDED' && transaction.status !== 'VOIDED'
        }

        return NextResponse.json(refundData)

    } catch (error) {
        console.error('Transaction lookup failed:', error)
        return NextResponse.json({ error: 'Failed to lookup transaction' }, { status: 500 })
    }
}
