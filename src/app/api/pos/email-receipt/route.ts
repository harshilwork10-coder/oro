import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// Send receipt via email
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { franchiseId?: string; email?: string }

        if (!user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await req.json()
        const { transactionId, email } = body

        if (!transactionId || !email) {
            return ApiResponse.validationError('Transaction ID and email are required')
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return ApiResponse.validationError('Invalid email format')
        }

        // Get transaction with line items
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                lineItems: true,
                client: true,
                employee: true,
                location: true
            }
        })

        if (!transaction) {
            return ApiResponse.notFound('Transaction not found')
        }

        // Build receipt content
        const receiptLines = transaction.lineItems.map(item =>
            `${item.name} x${item.quantity} - $${Number(item.total).toFixed(2)}`
        ).join('\n')

        const receiptContent = `
ORO 9 - Receipt
${transaction.location?.name || 'Location'}
=====================================
Invoice: #${transaction.invoiceNumber || transaction.id.slice(-8)}
Date: ${new Date(transaction.createdAt).toLocaleString()}
${transaction.employee?.name ? `Served by: ${transaction.employee.name}` : ''}

ITEMS:
${receiptLines}

-------------------------------------
Subtotal: $${Number(transaction.subtotal).toFixed(2)}
Tax: $${Number(transaction.tax).toFixed(2)}
TOTAL: $${Number(transaction.total).toFixed(2)}

Payment: ${transaction.paymentMethod}
${transaction.cardLast4 ? `Card: ****${transaction.cardLast4}` : ''}

Thank you for your business!
=====================================
        `.trim()

        // TODO: Integrate with email service (SendGrid, SES, etc.)
        // For now, log and return success (mock)
        console.error(`[Email Receipt] Sending to ${email}:`)
        console.error(receiptContent)

        // In production, you would do something like:
        // await sendEmail({
        //     to: email,
        //     subject: `Your Receipt from ${transaction.location?.name || 'ORO 9'}`,
        //     text: receiptContent,
        //     html: generateReceiptHtml(transaction)
        // })

        return ApiResponse.success({
            message: 'Receipt sent successfully',
            email: email,
            transactionId: transactionId
        })

    } catch (error) {
        console.error('Error sending email receipt:', error)
        return ApiResponse.serverError('Failed to send email receipt')
    }
}
