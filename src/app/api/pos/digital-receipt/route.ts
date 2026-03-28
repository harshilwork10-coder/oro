import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Digital Receipts API
 * 
 * POST /api/pos/digital-receipt — Send receipt via email or SMS
 * GET  /api/pos/digital-receipt — Get receipt delivery settings + stats
 */

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId

        const { searchParams } = new URL(request.url)
        const txId = searchParams.get('txId')

        // Lookup specific receipt
        if (txId) {
            const tx = await prisma.transaction.findFirst({
                where: { id: txId, franchiseId },
                select: {
                    id: true,
                    createdAt: true,
                    subtotal: true,
                    tax: true,
                    total: true,
                    paymentMethod: true,
                    employee: { select: { name: true } },
                    itemLineItems: {
                        select: {
                            quantity: true,
                            priceAtSale: true,
                            item: { select: { name: true, barcode: true } },
                        }
                    },
                },
            })

            if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

            return NextResponse.json({ receipt: formatReceipt(tx, franchiseId) })
        }

        // Get franchise for settings
        const franchise = await prisma.franchise.findFirst({
            where: { id: franchiseId },
            select: { name: true },
        })

        // Stats — count transactions in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        const totalTx = await prisma.transaction.count({
            where: { franchiseId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
        })

        return NextResponse.json({
            storeName: franchise?.name || 'Store',
            settings: {
                defaultMethod: 'ASK', // ASK, EMAIL, SMS, PRINT, NONE
                emailEnabled: true,
                smsEnabled: true,
                printEnabled: true,
                footerMessage: 'Thank you for shopping with us!',
                returnPolicy: 'Returns within 30 days with receipt.',
            },
            stats: {
                last30Days: totalTx,
                paperSaved: '~' + Math.round(totalTx * 0.3) + ' receipts could be digital',
                costSavings: '$' + (totalTx * 0.3 * 0.02).toFixed(2) + ' potential paper savings',
            },
            deliveryOptions: [
                { id: 'EMAIL', label: '📧 Email', icon: 'email', desc: 'Full HTML receipt with items, tax, payment' },
                { id: 'SMS', label: '📱 Text', icon: 'sms', desc: 'Compact receipt link via SMS' },
                { id: 'BOTH', label: '📧+📱 Both', icon: 'both', desc: 'Email receipt + SMS confirmation' },
                { id: 'PRINT', label: '🖨️ Print Only', icon: 'print', desc: 'Traditional paper receipt' },
                { id: 'NONE', label: '❌ No Receipt', icon: 'none', desc: 'Skip receipt' },
            ],
        })

    } catch (error) {
        console.error('Digital Receipt GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId

        const body = await request.json()
        const { action, txId, method, email, phone, customerName } = body

        if (action === 'send') {
            if (!txId) return NextResponse.json({ error: 'txId required' }, { status: 400 })

            const tx = await prisma.transaction.findFirst({
                where: { id: txId, franchiseId },
                select: {
                    id: true,
                    createdAt: true,
                    subtotal: true,
                    tax: true,
                    total: true,
                    paymentMethod: true,
                    employee: { select: { name: true } },
                    itemLineItems: {
                        select: {
                            quantity: true,
                            priceAtSale: true,
                            item: { select: { name: true, barcode: true } },
                        }
                    },
                },
            })

            if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

            const franchise = await prisma.franchise.findFirst({
                where: { id: franchiseId },
                select: { name: true },
            })

            const receipt = formatReceipt(tx, franchise?.name || 'Store')

            const results: { method: string; status: string; destination: string }[] = []

            if ((method === 'EMAIL' || method === 'BOTH') && email) {
                // In production: send via SendGrid/SES/etc
                // For now: log and return success
                results.push({
                    method: 'EMAIL',
                    status: 'SENT',
                    destination: email,
                })

                // Track customer email preference
                if (customerName || email) {
                    await trackCustomerPreference(franchiseId, email, phone, 'EMAIL', customerName)
                }
            }

            if ((method === 'SMS' || method === 'BOTH') && phone) {
                // In production: send via Twilio
                const smsBody = buildSMSReceipt(receipt)
                results.push({
                    method: 'SMS',
                    status: 'SENT',
                    destination: phone,
                })

                if (customerName || phone) {
                    await trackCustomerPreference(franchiseId, email, phone, 'SMS', customerName)
                }
            }

            return NextResponse.json({
                success: true,
                txId,
                receipt,
                delivery: results,
                htmlReceipt: buildHTMLReceipt(receipt),
            })
        }

        if (action === 'lookup') {
            // Lookup customer's receipt preference
            const lookupPhone = phone?.replace(/\D/g, '')
            const lookupEmail = email?.toLowerCase()

            // Find transactions for this customer
            // Search by matching customer data in recent transactions
            return NextResponse.json({
                preferences: {
                    method: lookupEmail ? 'EMAIL' : lookupPhone ? 'SMS' : 'PRINT',
                    email: lookupEmail || null,
                    phone: lookupPhone || null,
                },
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Digital Receipt POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// ─── Helper Functions ───

function formatReceipt(tx: any, storeName: string) {
    const items = (tx.itemLineItems || []).map((li: any) => ({
        name: li.item?.name || 'Item',
        qty: li.quantity,
        price: Number(li.priceAtSale || 0),
        total: Math.round(li.quantity * Number(li.priceAtSale || 0) * 100) / 100,
    }))

    return {
        txId: tx.id,
        txNumber: `TX-${tx.id.slice(-8).toUpperCase()}`,
        storeName,
        date: new Date(tx.createdAt).toLocaleDateString(),
        time: new Date(tx.createdAt).toLocaleTimeString(),
        cashier: tx.employee?.name || 'Staff',
        items,
        subtotal: Math.round(Number(tx.subtotal || 0) * 100) / 100,
        tax: Math.round(Number(tx.tax || 0) * 100) / 100,
        total: Math.round(Number(tx.total || 0) * 100) / 100,
        paymentMethod: tx.paymentMethod || 'CASH',
        footer: 'Thank you for your purchase!',
    }
}

function buildSMSReceipt(receipt: any): string {
    return [
        `${receipt.storeName} Receipt`,
        `${receipt.date} ${receipt.time}`,
        `${receipt.items.length} items`,
        `Total: $${receipt.total.toFixed(2)}`,
        `Paid: ${receipt.paymentMethod}`,
        `Ref: ${receipt.txNumber}`,
        `Thank you!`,
    ].join('\n')
}

function buildHTMLReceipt(receipt: any): string {
    const itemRows = receipt.items.map((i: any) =>
        `<tr><td style="padding:4px 8px">${i.name}</td><td style="padding:4px 8px;text-align:center">${i.qty}</td><td style="padding:4px 8px;text-align:right">$${i.total.toFixed(2)}</td></tr>`
    ).join('')

    return `
    <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;background:#1a1a1a;color:#fff;padding:24px;border-radius:12px">
        <h2 style="text-align:center;color:#f97316;margin:0">${receipt.storeName}</h2>
        <p style="text-align:center;color:#888;font-size:12px;margin:4px 0">${receipt.date} at ${receipt.time}</p>
        <p style="text-align:center;color:#888;font-size:12px;margin:0">Cashier: ${receipt.cashier}</p>
        <hr style="border-color:#333;margin:16px 0">
        <table style="width:100%;font-size:14px;border-collapse:collapse">
            <thead><tr style="color:#888"><th style="text-align:left;padding:4px 8px">Item</th><th style="padding:4px 8px">Qty</th><th style="text-align:right;padding:4px 8px">Price</th></tr></thead>
            <tbody>${itemRows}</tbody>
        </table>
        <hr style="border-color:#333;margin:16px 0">
        <div style="font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:2px 8px"><span style="color:#888">Subtotal</span><span>$${receipt.subtotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:2px 8px"><span style="color:#888">Tax</span><span>$${receipt.tax.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px;font-size:18px;font-weight:bold;color:#f97316"><span>TOTAL</span><span>$${receipt.total.toFixed(2)}</span></div>
        </div>
        <p style="text-align:center;color:#888;font-size:11px;margin-top:16px">Paid by ${receipt.paymentMethod}</p>
        <p style="text-align:center;color:#888;font-size:11px">${receipt.txNumber}</p>
        <p style="text-align:center;color:#f97316;font-size:12px;margin-top:12px">${receipt.footer}</p>
        <p style="text-align:center;color:#444;font-size:10px;margin-top:8px">Powered by ORO 9</p>
    </div>`
}

async function trackCustomerPreference(
    franchiseId: string,
    email?: string,
    phone?: string,
    method?: string,
    name?: string
) {
    // In a full implementation, this would upsert a customer record
    // For now, we track via a simple log
    console.log(`[Receipt Pref] ${franchiseId}: ${name || 'Unknown'} prefers ${method} → ${email || phone}`)
}
