import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET /api/pos/transactions/lookup - Lookup transaction by invoice number for refunds
// This enables the "scan receipt barcode" feature for quick refunds
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const invoiceNumber = searchParams.get('invoice')
        const transactionId = searchParams.get('id')

        if (!invoiceNumber && !transactionId) {
            return ApiResponse.validationError('Invoice number or transaction ID is required')
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: session.user.franchiseId
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
            return ApiResponse.notFound('Transaction')
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
            items: transaction.lineItems.map((item: {
                id: string;
                name: string | null;
                quantity: number;
                price: unknown;
                discount: unknown;
            }) => ({
                id: item.id,
                name: item.name || 'Unknown',
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: Number(item.price) * item.quantity * (1 - (Number(item.discount) || 0) / 100)
            })),
            refundable: transaction.status !== 'REFUNDED' && transaction.status !== 'VOIDED'
        }

        return ApiResponse.success(refundData)

    } catch (error) {
        console.error('Transaction lookup failed:', error)
        return ApiResponse.serverError('Failed to lookup transaction')
    }
}
