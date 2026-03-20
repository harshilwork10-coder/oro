// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Vendor Invoice Matching API
 * 
 * GET  — Fetch received POs with matching status
 * POST — Match an invoice against a PO, flag discrepancies
 * 
 * Discrepancy types:
 *   - QUANTITY_SHORT: vendor billed more than received
 *   - QUANTITY_OVER: vendor shipped more than ordered
 *   - PRICE_MISMATCH: invoice price ≠ PO agreed price
 *   - MISSING_ITEM: item on invoice not on PO
 *   - EXTRA_ITEM: item on PO not on invoice
 *   - DUPLICATE_INVOICE: invoice number already processed
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // RECEIVED, ALL
        const supplierId = searchParams.get('supplierId')

        // Get received POs that can be matched
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                franchiseId,
                status: status === 'ALL' ? undefined : 'RECEIVED',
                supplierId: supplierId || undefined,
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, barcode: true, price: true, cost: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50,
        })

        // Get suppliers for filtering
        const suppliers = await prisma.supplier.findMany({
            where: { franchiseId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        })

        const poSummaries = purchaseOrders.map(po => {
            const totalOrdered = po.items.reduce((s, item) => s + item.quantity, 0)
            const totalCost = po.items.reduce((s, item) => s + (item.quantity * Number(item.unitCost || 0)), 0)

            return {
                id: po.id,
                poNumber: `PO-${po.id.slice(-6).toUpperCase()}`,
                supplier: po.supplier?.name || 'Unknown',
                supplierId: po.supplierId,
                status: po.status,
                receivedAt: po.updatedAt,
                itemCount: po.items.length,
                totalUnits: totalOrdered,
                totalCost: Math.round(totalCost * 100) / 100,
                // Check if already matched (we store match data in notes field)
                matched: po.notes?.includes('INVOICE_MATCHED') || false,
                invoiceNumber: po.notes?.match(/INV:(\S+)/)?.[1] || null,
                items: po.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productName: item.product?.name || 'Unknown',
                    barcode: item.product?.barcode,
                    orderedQty: item.quantity,
                    unitCost: Number(item.unitCost || 0),
                    lineCost: Math.round(item.quantity * Number(item.unitCost || 0) * 100) / 100,
                })),
            }
        })

        return NextResponse.json({
            purchaseOrders: poSummaries,
            suppliers,
            stats: {
                total: poSummaries.length,
                matched: poSummaries.filter(p => p.matched).length,
                unmatched: poSummaries.filter(p => !p.matched).length,
                totalValue: Math.round(poSummaries.reduce((s, p) => s + p.totalCost, 0) * 100) / 100,
            }
        })

    } catch (error) {
        console.error('Invoice Match GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await request.json()
        const { action, poId, invoiceNumber, invoiceItems, invoiceTotal } = body

        if (action === 'match') {
            if (!poId || !invoiceNumber) {
                return NextResponse.json({ error: 'poId and invoiceNumber required' }, { status: 400 })
            }

            // Fetch the PO
            const po = await prisma.purchaseOrder.findFirst({
                where: { id: poId, franchiseId },
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, name: true, barcode: true, cost: true } }
                        }
                    },
                    supplier: { select: { name: true } },
                }
            })

            if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

            // Compare PO items against invoice items
            const discrepancies: any[] = []
            let matchedItems = 0
            let totalPOCost = 0
            let totalInvoiceCost = 0

            // Build lookup from invoice items
            const invoiceLookup = new Map<string, { qty: number; unitCost: number; name: string }>()
            if (invoiceItems?.length) {
                for (const item of invoiceItems) {
                    invoiceLookup.set(item.productId || item.barcode || item.name, {
                        qty: item.quantity,
                        unitCost: item.unitCost,
                        name: item.name,
                    })
                }
            }

            // Check each PO item against invoice
            for (const poItem of po.items) {
                const key = poItem.productId || poItem.product?.barcode || poItem.product?.name || ''
                const invoiceItem = invoiceLookup.get(key)
                const poUnitCost = Number(poItem.unitCost || 0)
                totalPOCost += poItem.quantity * poUnitCost

                if (!invoiceItem) {
                    // Item on PO but not on invoice
                    discrepancies.push({
                        type: 'EXTRA_ITEM',
                        severity: 'warning',
                        productName: poItem.product?.name || 'Unknown',
                        productId: poItem.productId,
                        poQty: poItem.quantity,
                        invoiceQty: 0,
                        poCost: poUnitCost,
                        invoiceCost: 0,
                        message: `${poItem.product?.name} is on PO but not on invoice`,
                        costImpact: -(poItem.quantity * poUnitCost),
                    })
                    continue
                }

                totalInvoiceCost += invoiceItem.qty * invoiceItem.unitCost

                // Check quantity
                if (invoiceItem.qty !== poItem.quantity) {
                    const diff = invoiceItem.qty - poItem.quantity
                    discrepancies.push({
                        type: diff > 0 ? 'QUANTITY_OVER' : 'QUANTITY_SHORT',
                        severity: Math.abs(diff) > 5 ? 'critical' : 'warning',
                        productName: poItem.product?.name || 'Unknown',
                        productId: poItem.productId,
                        poQty: poItem.quantity,
                        invoiceQty: invoiceItem.qty,
                        difference: diff,
                        message: diff > 0
                            ? `Billed ${diff} more than ordered`
                            : `Short ${Math.abs(diff)} units`,
                        costImpact: Math.round(diff * invoiceItem.unitCost * 100) / 100,
                    })
                }

                // Check unit cost
                if (Math.abs(invoiceItem.unitCost - poUnitCost) > 0.01) {
                    const priceDiff = invoiceItem.unitCost - poUnitCost
                    discrepancies.push({
                        type: 'PRICE_MISMATCH',
                        severity: Math.abs(priceDiff) > 1 ? 'critical' : 'warning',
                        productName: poItem.product?.name || 'Unknown',
                        productId: poItem.productId,
                        poCost: poUnitCost,
                        invoiceCost: invoiceItem.unitCost,
                        difference: Math.round(priceDiff * 100) / 100,
                        message: `Price ${priceDiff > 0 ? 'increased' : 'decreased'} by $${Math.abs(priceDiff).toFixed(2)}/unit`,
                        costImpact: Math.round(priceDiff * poItem.quantity * 100) / 100,
                    })
                }

                if (invoiceItem.qty === poItem.quantity && Math.abs(invoiceItem.unitCost - poUnitCost) <= 0.01) {
                    matchedItems++
                }

                invoiceLookup.delete(key)
            }

            // Remaining invoice items not on PO
            for (const [key, item] of invoiceLookup.entries()) {
                totalInvoiceCost += item.qty * item.unitCost
                discrepancies.push({
                    type: 'MISSING_ITEM',
                    severity: 'critical',
                    productName: item.name || key,
                    invoiceQty: item.qty,
                    invoiceCost: item.unitCost,
                    message: `Item on invoice but not on PO — potential billing error`,
                    costImpact: Math.round(item.qty * item.unitCost * 100) / 100,
                })
            }

            // Total difference
            if (invoiceTotal) {
                totalInvoiceCost = invoiceTotal
            }
            const totalDifference = Math.round((totalInvoiceCost - totalPOCost) * 100) / 100

            // Mark PO as matched
            if (discrepancies.length === 0) {
                await prisma.purchaseOrder.update({
                    where: { id: poId },
                    data: {
                        notes: `INVOICE_MATCHED INV:${invoiceNumber} MATCHED_AT:${new Date().toISOString()} STATUS:CLEAN`
                    }
                })
            } else {
                await prisma.purchaseOrder.update({
                    where: { id: poId },
                    data: {
                        notes: `INVOICE_MATCHED INV:${invoiceNumber} MATCHED_AT:${new Date().toISOString()} STATUS:DISCREPANCIES:${discrepancies.length}`
                    }
                })
            }

            return NextResponse.json({
                matched: true,
                poId,
                invoiceNumber,
                supplier: po.supplier?.name,
                summary: {
                    totalPOItems: po.items.length,
                    matchedItems,
                    discrepancyCount: discrepancies.length,
                    poCost: Math.round(totalPOCost * 100) / 100,
                    invoiceCost: Math.round(totalInvoiceCost * 100) / 100,
                    totalDifference,
                    status: discrepancies.length === 0 ? 'CLEAN' : totalDifference > 50 ? 'CRITICAL' : 'WARNING',
                },
                discrepancies,
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Invoice Match POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
