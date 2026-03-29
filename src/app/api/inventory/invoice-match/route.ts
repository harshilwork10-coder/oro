import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Invoice Matching — Match vendor invoices against POs, flag discrepancies
 * GET /api/inventory/invoice-match — Fetch received POs
 * POST /api/inventory/invoice-match — Match invoice against PO
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')

    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: status === 'ALL' ? undefined : 'RECEIVED',
                supplierId: supplierId || undefined
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: { include: { product: { select: { id: true, name: true, barcode: true, price: true, cost: true } } } }
            },
            orderBy: { updatedAt: 'desc' }, take: 50
        })

        const suppliers = await prisma.supplier.findMany({
            where: { franchiseId: user.franchiseId }, select: { id: true, name: true }, orderBy: { name: 'asc' }
        })

        const poSummaries = purchaseOrders.map(po => {
            const totalOrdered = po.items.reduce((s, item) => s + item.quantity, 0)
            const totalCost = po.items.reduce((s, item) => s + (item.quantity * Number(item.unitCost || 0)), 0)
            return {
                id: po.id, poNumber: `PO-${po.id.slice(-6).toUpperCase()}`,
                supplier: po.supplier?.name || 'Unknown', supplierId: po.supplierId,
                status: po.status, receivedAt: po.updatedAt, itemCount: po.items.length,
                totalUnits: totalOrdered, totalCost: Math.round(totalCost * 100) / 100,
                matched: po.notes?.includes('INVOICE_MATCHED') || false,
                invoiceNumber: po.notes?.match(/INV:(\S+)/)?.[1] || null,
                items: po.items.map(item => ({
                    id: item.id, productId: item.productId,
                    productName: item.product?.name || 'Unknown', barcode: item.product?.barcode,
                    orderedQty: item.quantity, unitCost: Number(item.unitCost || 0),
                    lineCost: Math.round(item.quantity * Number(item.unitCost || 0) * 100) / 100
                }))
            }
        })

        return NextResponse.json({
            purchaseOrders: poSummaries, suppliers,
            stats: {
                total: poSummaries.length, matched: poSummaries.filter(p => p.matched).length,
                unmatched: poSummaries.filter(p => !p.matched).length,
                totalValue: Math.round(poSummaries.reduce((s, p) => s + p.totalCost, 0) * 100) / 100
            }
        })
    } catch (error: any) {
        console.error('[INVOICE_MATCH_GET]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { action, poId, invoiceNumber, invoiceItems, invoiceTotal } = await req.json()

        if (action === 'match') {
            if (!poId || !invoiceNumber) return NextResponse.json({ error: 'poId and invoiceNumber required' }, { status: 400 })

            const po = await prisma.purchaseOrder.findFirst({
                where: { id: poId, franchiseId: user.franchiseId },
                include: {
                    items: { include: { product: { select: { id: true, name: true, barcode: true, cost: true } } } },
                    supplier: { select: { name: true } }
                }
            })
            if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

            const discrepancies: any[] = []
            let matchedItems = 0, totalPOCost = 0, totalInvoiceCost = 0

            const invoiceLookup = new Map<string, { qty: number; unitCost: number; name: string }>()
            if (invoiceItems?.length) {
                for (const item of invoiceItems) {
                    invoiceLookup.set(item.productId || item.barcode || item.name, { qty: item.quantity, unitCost: item.unitCost, name: item.name })
                }
            }

            for (const poItem of po.items) {
                const key = poItem.productId || poItem.product?.barcode || poItem.product?.name || ''
                const invoiceItem = invoiceLookup.get(key)
                const poUnitCost = Number(poItem.unitCost || 0)
                totalPOCost += poItem.quantity * poUnitCost

                if (!invoiceItem) {
                    discrepancies.push({ type: 'EXTRA_ITEM', severity: 'warning', productName: poItem.product?.name || 'Unknown', productId: poItem.productId, poQty: poItem.quantity, invoiceQty: 0, message: `${poItem.product?.name} on PO but not on invoice`, costImpact: -(poItem.quantity * poUnitCost) })
                    continue
                }

                totalInvoiceCost += invoiceItem.qty * invoiceItem.unitCost

                if (invoiceItem.qty !== poItem.quantity) {
                    const diff = invoiceItem.qty - poItem.quantity
                    discrepancies.push({ type: diff > 0 ? 'QUANTITY_OVER' : 'QUANTITY_SHORT', severity: Math.abs(diff) > 5 ? 'critical' : 'warning', productName: poItem.product?.name || 'Unknown', productId: poItem.productId, poQty: poItem.quantity, invoiceQty: invoiceItem.qty, difference: diff, message: diff > 0 ? `Billed ${diff} more than ordered` : `Short ${Math.abs(diff)} units`, costImpact: Math.round(diff * invoiceItem.unitCost * 100) / 100 })
                }

                if (Math.abs(invoiceItem.unitCost - poUnitCost) > 0.01) {
                    const priceDiff = invoiceItem.unitCost - poUnitCost
                    discrepancies.push({ type: 'PRICE_MISMATCH', severity: Math.abs(priceDiff) > 1 ? 'critical' : 'warning', productName: poItem.product?.name || 'Unknown', productId: poItem.productId, poCost: poUnitCost, invoiceCost: invoiceItem.unitCost, difference: Math.round(priceDiff * 100) / 100, message: `Price ${priceDiff > 0 ? 'increased' : 'decreased'} by $${Math.abs(priceDiff).toFixed(2)}/unit`, costImpact: Math.round(priceDiff * poItem.quantity * 100) / 100 })
                }

                if (invoiceItem.qty === poItem.quantity && Math.abs(invoiceItem.unitCost - poUnitCost) <= 0.01) matchedItems++
                invoiceLookup.delete(key)
            }

            for (const [key, item] of invoiceLookup.entries()) {
                totalInvoiceCost += item.qty * item.unitCost
                discrepancies.push({ type: 'MISSING_ITEM', severity: 'critical', productName: item.name || key, invoiceQty: item.qty, invoiceCost: item.unitCost, message: 'Item on invoice but not on PO', costImpact: Math.round(item.qty * item.unitCost * 100) / 100 })
            }

            if (invoiceTotal) totalInvoiceCost = invoiceTotal
            const totalDifference = Math.round((totalInvoiceCost - totalPOCost) * 100) / 100

            const matchNote = `INVOICE_MATCHED INV:${invoiceNumber} MATCHED_AT:${new Date().toISOString()} STATUS:${discrepancies.length === 0 ? 'CLEAN' : 'DISCREPANCIES:' + discrepancies.length}`
            await prisma.purchaseOrder.update({ where: { id: poId }, data: { notes: matchNote } })

            return NextResponse.json({
                matched: true, poId, invoiceNumber, supplier: po.supplier?.name,
                summary: { totalPOItems: po.items.length, matchedItems, discrepancyCount: discrepancies.length, poCost: Math.round(totalPOCost * 100) / 100, invoiceCost: Math.round(totalInvoiceCost * 100) / 100, totalDifference, status: discrepancies.length === 0 ? 'CLEAN' : totalDifference > 50 ? 'CRITICAL' : 'WARNING' },
                discrepancies
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error: any) {
        console.error('[INVOICE_MATCH_POST]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
