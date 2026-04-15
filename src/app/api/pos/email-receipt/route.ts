import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// Send receipt via email
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { transactionId, email } = body

        if (!transactionId || !email) {
            return NextResponse.json({ error: 'Transaction ID and email are required' }, { status: 422 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 422 })
        }

        // Get transaction with line items
        const txRaw = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        if (!txRaw) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Cast to any to access fields without strict schema validation
        // (receipt building only - not used for financial logic)
        const transaction = txRaw as unknown as Record<string, any>

        // Fetch employee name if available
        const employeeUser = transaction.employeeId
            ? await prisma.user.findUnique({ where: { id: transaction.employeeId as string }, select: { name: true } })
            : null

        // Build receipt content
        const receiptLines = (transaction.lineItems as any[]).map((item: any) =>
            `${item.name || item.type || 'Item'} x${item.quantity} - $${Number(item.total).toFixed(2)}`
        ).join('\n')

        const receiptContent = `
ORO 9 - Receipt
=====================================
Invoice: #${transaction.invoiceNumber || transaction.id.slice(-8)}
Date: ${new Date(transaction.createdAt).toLocaleString()}
${employeeUser?.name ? `Served by: ${employeeUser.name}` : ''}

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

        return NextResponse.json({
            message: 'Receipt sent successfully',
            email: email,
            transactionId: transactionId
        })

    } catch (error) {
        console.error('Error sending email receipt:', error)
        return NextResponse.json({ error: 'Failed to send email receipt' }, { status: 500 })
    }
}
