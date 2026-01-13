import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// In-memory rate limiter (consider Redis for production)
const receiptRateLimits = new Map<string, number>()

// POST - Send SMS receipt
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // SECURITY: Rate Limiting
        const now = Date.now()
        const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
        const lastRequest = receiptRateLimits.get(clientIP) || 0

        // 1 request every 2 seconds per IP is reasonable for manual POS usage
        if (now - lastRequest < 2000) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }
        receiptRateLimits.set(clientIP, now)

        const body = await request.json()
        const { phone, transactionId } = body

        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
        }

        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
        }

        // SECURITY: Force DB lookup. Do NOT accept client-provided transaction data.
        if (!transactionId) {
            return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                lineItems: { include: { service: true, product: true } },
                cashDrawerSession: {
                    include: { location: { select: { name: true, address: true, publicPhone: true } } }
                }
            }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found or valid' }, { status: 404 })
        }

        // Build receipt message
        // Handle optional location data safely
        const storeName = transaction.cashDrawerSession?.location?.name || 'Store'
        // Location phone might not be in the select, defaulting to empty
        const storePhone = ''

        const invoiceNum = transaction.invoiceNumber || transactionId?.slice(-8) || 'N/A'

        // Ensure numbers
        const total = Number(transaction.total)
        const subtotal = Number(transaction.subtotal)
        const tax = Number(transaction.tax)
        const tip = Number(transaction.tip || 0)

        // Get card fee percentage (dual pricing - default 3.99%)
        const cardFeePercent = 3.99
        const paymentMethod = transaction.paymentMethod || 'CASH'

        // Format items list with DUAL PRICING (shows both cash and card price per item)
        let itemsList = ''
        const items = transaction.lineItems || []
        if (items.length > 0) {
            const displayItems = items.slice(0, 4) // Fewer items to fit dual prices
            itemsList = displayItems.map((item: any) => {
                const name = item.product?.name || item.service?.name || item.name || 'Item'
                const qty = item.quantity || 1
                const cashPrice = Number(item.price) // Assume stored price is Cash Price
                const cardPrice = cashPrice * (1 + cardFeePercent / 100)
                return `${qty}x ${name.slice(0, 14)}\n💵$${cashPrice.toFixed(2)}  💳$${cardPrice.toFixed(2)}`
            }).join('\n')

            if (items.length > 4) {
                itemsList += `\n+${items.length - 4} more items`
            }
        }

        // Build the SMS message
        const date = new Date().toLocaleDateString()
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        // Calculate dual pricing totals
        const cashSubtotal = subtotal
        const cardSubtotal = subtotal * (1 + cardFeePercent / 100)
        const cashTax = tax
        const cardTax = tax * (1 + cardFeePercent / 100)
        const cashTotal = cashSubtotal + cashTax
        const cardTotal = cardSubtotal + cardTax

        // Payment indicator
        const paidWith = paymentMethod.includes('CARD') || paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'
            ? '✓ PAID CARD'
            : '✓ PAID CASH'

        const smsMessage = `${storeName}
${date} ${time}
#${invoiceNum}

${itemsList}

━━━━━━━━━━━━━
Subtotal:
  💵 $${cashSubtotal.toFixed(2)}  💳 $${cardSubtotal.toFixed(2)}
Tax:
  💵 $${cashTax.toFixed(2)}  💳 $${cardTax.toFixed(2)}
━━━━━━━━━━━━━
💵 CASH: $${cashTotal.toFixed(2)}
💳 CARD: $${cardTotal.toFixed(2)}
${tip > 0 ? `Tip: $${tip.toFixed(2)}\n` : ''}
${paidWith}

Thank you!`

        // In production, send via Twilio/AWS SNS/etc.
        // For now, simulate success

        return NextResponse.json({
            success: true,
            message: 'Receipt sent successfully',
            phone: cleanPhone.slice(-4).padStart(10, '***-***-'),
            preview: smsMessage.slice(0, 100) + '...'
        })

    } catch (error) {
        console.error('SMS Receipt error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// GET - Get receipt settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Return receipt configuration
        return NextResponse.json({
            smsEnabled: true,
            emailEnabled: false, // Future
            printEnabled: true,
            defaultOption: 'ask', // 'ask', 'print', 'sms', 'none'
            maxMessageLength: 160 * 3 // 3 SMS segments
        })

    } catch (error) {
        console.error('SMS Receipt GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
