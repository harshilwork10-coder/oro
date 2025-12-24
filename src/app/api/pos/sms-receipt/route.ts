import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Send SMS receipt
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { phone, transactionId, transactionData } = body

        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
        }

        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
        }

        // Get transaction details if ID provided
        let transaction = transactionData
        if (transactionId && !transaction) {
            transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    items: { include: { item: { select: { name: true } } } },
                    cashDrawerSession: {
                        include: { location: { select: { name: true, address: true, phone: true } } }
                    }
                }
            })
        }

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Build receipt message
        const storeName = transaction.cashDrawerSession?.location?.name || 'Store'
        const storePhone = transaction.cashDrawerSession?.location?.phone || ''
        const invoiceNum = transaction.invoiceNumber || transactionId?.slice(-8) || 'N/A'
        const total = typeof transaction.total === 'object'
            ? Number(transaction.total)
            : transaction.total
        const subtotal = typeof transaction.subtotal === 'object'
            ? Number(transaction.subtotal)
            : transaction.subtotal
        const tax = typeof transaction.tax === 'object'
            ? Number(transaction.tax)
            : transaction.tax

        // Get card fee percentage (dual pricing - default 3.99%)
        const cardFeePercent = transaction.cardFeePercent || 3.99
        const paymentMethod = transaction.paymentMethod || 'CASH'
        const tip = typeof transaction.tipAmount === 'object'
            ? Number(transaction.tipAmount)
            : (transaction.tipAmount || 0)

        // Format items list with DUAL PRICING (shows both cash and card price per item)
        let itemsList = ''
        const items = transaction.items || []
        if (items.length > 0) {
            const displayItems = items.slice(0, 4) // Fewer items to fit dual prices
            itemsList = displayItems.map((item: any) => {
                const name = item.item?.name || item.name || 'Item'
                const qty = item.quantity || 1
                const cashPrice = typeof item.subtotal === 'object'
                    ? Number(item.subtotal)
                    : (item.subtotal || 0)
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
        // For now, log and simulate success
        console.log('SMS Receipt:', {
            to: cleanPhone,
            message: smsMessage,
            transactionId
        })

        // Store receipt log
        try {
            // Could create a ReceiptLog model, for now just log to console
            console.log('Receipt sent to:', cleanPhone)
        } catch (e) {
            // Optional logging
        }

        // TODO: Add actual SMS sending here
        // Example with Twilio:
        // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH)
        // await twilio.messages.create({
        //     body: smsMessage,
        //     from: process.env.TWILIO_PHONE,
        //     to: '+1' + cleanPhone
        // })

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
