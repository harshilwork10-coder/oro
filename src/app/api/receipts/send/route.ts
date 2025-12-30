import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SendReceiptRequest {
    transactionId: string
    method: 'sms' | 'email'
    destination: string // phone number or email
}

// POST: Send a digital receipt to customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { transactionId, method, destination } = await request.json() as SendReceiptRequest

        if (!transactionId || !method || !destination) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate destination format
        if (method === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(destination)) {
                return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
            }
        } else if (method === 'sms') {
            const phoneRegex = /^\+?[\d\s-()]{10,}$/
            if (!phoneRegex.test(destination)) {
                return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
            }
        }

        // Get transaction details
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                franchise: true,
                employee: true
            }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Build receipt content
        const storeName = transaction.franchise?.name || 'Store'
        const date = new Date(transaction.createdAt).toLocaleDateString()
        const time = new Date(transaction.createdAt).toLocaleTimeString()
        const total = Number(transaction.total).toFixed(2)
        const subtotal = Number(transaction.subtotal).toFixed(2)
        const tax = Number(transaction.tax).toFixed(2)
        const paymentMethod = transaction.paymentMethod || 'CASH'
        const invoiceNumber = transaction.invoiceNumber || transaction.id.slice(-8).toUpperCase()

        // Generate receipt text (for SMS)
        const smsReceipt = `
${storeName}
Receipt #${invoiceNumber}
${date} ${time}

Subtotal: $${subtotal}
Tax: $${tax}
TOTAL: $${total}

Payment: ${paymentMethod}

Thank you for your purchase!
`.trim()

        // Generate receipt HTML (for email)
        const emailReceipt = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .store-name { font-size: 24px; font-weight: bold; }
        .receipt-info { color: #666; font-size: 14px; margin-top: 5px; }
        .line-items { margin: 20px 0; }
        .totals { border-top: 1px dashed #999; padding-top: 15px; }
        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="store-name">${storeName}</div>
        <div class="receipt-info">Receipt #${invoiceNumber}</div>
        <div class="receipt-info">${date} at ${time}</div>
    </div>
    
    <div class="totals">
        <div class="total-row">
            <span>Subtotal</span>
            <span>$${subtotal}</span>
        </div>
        <div class="total-row">
            <span>Tax</span>
            <span>$${tax}</span>
        </div>
        <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>$${total}</span>
        </div>
        <div class="total-row" style="margin-top: 15px;">
            <span>Payment Method</span>
            <span>${paymentMethod}</span>
        </div>
    </div>
    
    <div class="footer">
        <p>Thank you for shopping with us!</p>
        <p>Have a great day!</p>
    </div>
</body>
</html>
`.trim()

        // TODO: Integrate with actual SMS/Email service
        // For MVP, we'll log and simulate success
        if (method === 'sms') {
            console.log(`[DIGITAL_RECEIPT] SMS to ${destination}:`)
            console.log(smsReceipt)
            // TODO: Integration with Twilio or similar
            // await twilioClient.messages.create({
            //     body: smsReceipt,
            //     to: destination,
            //     from: process.env.TWILIO_PHONE_NUMBER
            // })
        } else {
            console.log(`[DIGITAL_RECEIPT] Email to ${destination}:`)
            console.log('Subject: Your Receipt from', storeName)
            // TODO: Integration with SendGrid, Mailgun, or similar
            // await sendgridClient.send({
            //     to: destination,
            //     from: 'receipts@yourdomain.com',
            //     subject: `Your Receipt from ${storeName}`,
            //     html: emailReceipt
            // })
        }

        // Update transaction with receipt sent info (optional tracking)
        // Could add a receiptSentTo field to Transaction model

        return NextResponse.json({
            success: true,
            message: `Receipt sent via ${method} to ${destination}`,
            preview: method === 'sms' ? smsReceipt : 'HTML Email sent'
        })

    } catch (error) {
        console.error('[SEND_RECEIPT]', error)
        return NextResponse.json({ error: 'Failed to send receipt' }, { status: 500 })
    }
}

