/**
 * PDF Document Generator API
 *
 * POST — Generate PDF for invoices, purchase orders, EOD reports
 *
 * Returns HTML that can be printed via window.print() or converted
 * server-side to PDF. Zero external dependencies.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, id, dateRange } = await request.json()

    if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locationId: true, location: { select: { name: true, address: true, phone: true } } },
    })

    const storeName = (user as any)?.location?.name || 'ORO 9 POS'
    const storeAddress = (user as any)?.location?.address || ''
    const storePhone = (user as any)?.location?.phone || ''

    let html = ''

    switch (type) {
        case 'INVOICE': {
            const txn = id ? await prisma.transaction.findUnique({
                where: { id },
                include: { lineItems: true, taxLines: true },
            }) : null

            if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

            html = generateInvoiceHTML(txn, storeName, storeAddress, storePhone)
            break
        }

        case 'PURCHASE_ORDER': {
            const po = id ? await prisma.purchaseOrder.findUnique({
                where: { id },
                include: { items: true, supplier: true },
            }) : null

            if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

            html = generatePurchaseOrderHTML(po, storeName, storeAddress)
            break
        }

        case 'EOD_REPORT': {
            const date = dateRange?.start || new Date().toISOString().split('T')[0]
            const dayStart = new Date(date + 'T00:00:00')
            const dayEnd = new Date(date + 'T23:59:59')

            const transactions = await prisma.transaction.findMany({
                where: { locationId: user?.locationId || '', createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' },
                include: { lineItems: true },
            })

            html = generateEODHTML(transactions, date, storeName)
            break
        }

        default:
            return NextResponse.json({ error: 'Invalid type. Use INVOICE, PURCHASE_ORDER, or EOD_REPORT' }, { status: 400 })
    }

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}

function generateInvoiceHTML(txn: any, store: string, address: string, phone: string): string {
    const items = (txn.lineItems || []).map((li: any) =>
        `<tr><td>${li.name || li.itemId}</td><td class="center">${li.quantity}</td><td class="right">$${Number(li.price || 0).toFixed(2)}</td><td class="right">$${Number(li.total || li.price * li.quantity || 0).toFixed(2)}</td></tr>`
    ).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}
.header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
.header h1{margin:0;font-size:24px}.header p{margin:2px 0;color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;margin:15px 0}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}
.right{text-align:right}.center{text-align:center}
.total-row{font-weight:bold;font-size:16px;border-top:2px solid #333}
.footer{text-align:center;margin-top:30px;color:#999;font-size:11px}
@media print{body{padding:0}.no-print{display:none}}</style></head><body>
<div class="header"><h1>${store}</h1><p>${address}</p><p>${phone}</p><p style="margin-top:10px;font-size:14px"><strong>INVOICE</strong></p></div>
<p><strong>Receipt #:</strong> ${txn.receiptNumber || txn.id.slice(0, 8)}</p>
<p><strong>Date:</strong> ${new Date(txn.createdAt).toLocaleString()}</p>
<table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
<tbody>${items}</tbody>
<tfoot><tr><td colspan="3" class="right">Subtotal</td><td class="right">$${Number(txn.subtotal || txn.total || 0).toFixed(2)}</td></tr>
<tr><td colspan="3" class="right">Tax</td><td class="right">$${Number(txn.taxAmount || 0).toFixed(2)}</td></tr>
<tr class="total-row"><td colspan="3" class="right">TOTAL</td><td class="right">$${Number(txn.total || 0).toFixed(2)}</td></tr></tfoot></table>
<div class="footer"><p>Thank you for your business!</p><p>Powered by ORO 9 POS</p></div></body></html>`
}

function generatePurchaseOrderHTML(po: any, store: string, address: string): string {
    const items = (po.items || []).map((item: any) =>
        `<tr><td>${item.name || item.itemId}</td><td class="center">${item.quantity}</td><td class="right">$${Number(item.cost || 0).toFixed(2)}</td><td class="right">$${(Number(item.cost || 0) * item.quantity).toFixed(2)}</td></tr>`
    ).join('')

    const total = (po.items || []).reduce((s: number, i: any) => s + Number(i.cost || 0) * i.quantity, 0)

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}
.header{border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;display:flex;justify-content:space-between}
table{width:100%;border-collapse:collapse;margin:15px 0}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}
.right{text-align:right}.center{text-align:center}.total-row{font-weight:bold;border-top:2px solid #333}
@media print{body{padding:0}}</style></head><body>
<div class="header"><div><h1 style="margin:0">PURCHASE ORDER</h1><p>${store}</p><p style="font-size:12px;color:#666">${address}</p></div>
<div style="text-align:right"><p><strong>PO #:</strong> ${po.id.slice(0, 8).toUpperCase()}</p><p><strong>Date:</strong> ${new Date(po.createdAt).toLocaleDateString()}</p><p><strong>Status:</strong> ${po.status}</p></div></div>
<p><strong>Vendor:</strong> ${po.supplier?.name || 'N/A'}</p>
<table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Unit Cost</th><th class="right">Total</th></tr></thead>
<tbody>${items}</tbody>
<tfoot><tr class="total-row"><td colspan="3" class="right">TOTAL</td><td class="right">$${total.toFixed(2)}</td></tr></tfoot></table>
<div style="margin-top:40px;display:flex;gap:60px"><div><p>__________________________</p><p style="font-size:12px;color:#666">Authorized Signature</p></div><div><p>__________________________</p><p style="font-size:12px;color:#666">Date</p></div></div></body></html>`
}

function generateEODHTML(transactions: any[], date: string, store: string): string {
    const revenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
    const tax = transactions.reduce((s, t) => s + Number(t.taxAmount || 0), 0)
    const avgTicket = transactions.length > 0 ? revenue / transactions.length : 0

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}
h1{text-align:center;margin-bottom:5px}h2{color:#666;font-size:14px;text-align:center;margin-top:0}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0}
.stat{text-align:center;padding:15px;border:1px solid #ddd;border-radius:8px}
.stat .value{font-size:28px;font-weight:bold}.stat .label{color:#666;font-size:12px;margin-top:4px}
.footer{text-align:center;margin-top:30px;color:#999;font-size:11px}
@media print{body{padding:0}}</style></head><body>
<h1>${store}</h1><h2>End of Day Report — ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
<div class="stats">
<div class="stat"><div class="value">$${revenue.toFixed(2)}</div><div class="label">Total Revenue</div></div>
<div class="stat"><div class="value">${transactions.length}</div><div class="label">Transactions</div></div>
<div class="stat"><div class="value">$${avgTicket.toFixed(2)}</div><div class="label">Avg Ticket</div></div>
<div class="stat"><div class="value">$${tax.toFixed(2)}</div><div class="label">Tax Collected</div></div>
<div class="stat"><div class="value">$${(revenue - tax).toFixed(2)}</div><div class="label">Net Revenue</div></div>
</div>
<div class="footer"><p>Generated ${new Date().toLocaleString()}</p><p>ORO 9 POS</p></div></body></html>`
}
