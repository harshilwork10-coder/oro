import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Internal Audit Endpoint - Transaction Verification
 * 
 * Returns complete audit trail for any transaction showing:
 * - Transaction header + type
 * - All line items with snapshots
 * - Tax line breakdown
 * - Payment details
 * - Where the $ amount appears in each report bucket
 * 
 * This proves a transaction flows correctly through all accounting buckets.
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const transactionId = params.id

    // Fetch complete transaction with all relations
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
            franchise: {
                select: { id: true, name: true }
            },
            client: {
                select: { id: true, firstName: true, lastName: true }
            },
            employee: {
                select: { id: true, name: true }
            },
            lineItems: {
                include: {
                    service: { select: { id: true, name: true } },
                    product: { select: { id: true, name: true } },
                    staff: { select: { id: true, name: true } }
                }
            },
            taxLines: true,
            originalTransaction: {
                select: { id: true, invoiceNumber: true, total: true, createdAt: true }
            },
            refunds: {
                select: { id: true, invoiceNumber: true, total: true, createdAt: true }
            },
            cashDrawerSession: {
                select: { id: true, startBalance: true, expectedCash: true }
            },
            drawerActivities: true
        }
    })

    if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Calculate report bucket impacts
    const amount = parseFloat(transaction.total.toString())
    const taxAmount = parseFloat(transaction.tax.toString())
    const tipAmount = parseFloat(transaction.tip.toString())
    const isCash = transaction.paymentMethod === 'CASH'
    const isRefund = transaction.type === 'REFUND' || transaction.status === 'REFUNDED'
    const isVoid = transaction.type === 'VOID' || transaction.status === 'VOIDED'

    // Build report buckets showing where this transaction appears
    const reportBuckets = {
        // Dashboard totals
        grossSales: isVoid ? 0 : (isRefund ? 0 : amount),
        refunds: isRefund ? -amount : 0,
        voids: isVoid ? amount : 0,
        netSales: isVoid ? 0 : (isRefund ? -amount : amount),

        // Tax
        taxableAmount: parseFloat(transaction.subtotal.toString()),
        taxCollected: taxAmount,

        // Tips
        tipsCollected: tipAmount,

        // Payment method breakdown
        cashSales: isCash && !isRefund && !isVoid ? amount : 0,
        cardSales: !isCash && !isRefund && !isVoid ? amount : 0,
        cashRefunds: isCash && isRefund ? -amount : 0,
        cardRefunds: !isCash && isRefund ? -amount : 0,

        // Drawer impact (only cash affects drawer)
        drawerImpact: isCash ? (isRefund ? -amount : amount) : 0,

        // Employee revenue attribution
        employeeRevenue: {} as Record<string, number>,

        // Service/Product revenue
        serviceRevenue: {} as Record<string, number>,
        productRevenue: {} as Record<string, number>
    }

    // Calculate per-employee and per-service/product revenue
    for (const item of transaction.lineItems) {
        const lineTotal = parseFloat(item.total.toString())

        if (item.staff?.name) {
            reportBuckets.employeeRevenue[item.staff.name] =
                (reportBuckets.employeeRevenue[item.staff.name] || 0) + lineTotal
        }

        if (item.type === 'SERVICE' && item.service?.name) {
            reportBuckets.serviceRevenue[item.service.name] =
                (reportBuckets.serviceRevenue[item.service.name] || 0) + lineTotal
        }

        if (item.type === 'PRODUCT' && item.product?.name) {
            reportBuckets.productRevenue[item.product.name] =
                (reportBuckets.productRevenue[item.product.name] || 0) + lineTotal
        }
    }

    // Build reconciliation check
    const reconciliationCheck = {
        ledgerAmount: amount,
        paymentTotal: parseFloat(transaction.cashAmount.toString()) +
            parseFloat(transaction.cardAmount.toString()) || amount,
        balanced: true,
        discrepancies: [] as string[]
    }

    // Check for discrepancies
    if (Math.abs(reconciliationCheck.ledgerAmount - reconciliationCheck.paymentTotal) > 0.01) {
        reconciliationCheck.balanced = false
        reconciliationCheck.discrepancies.push(
            `Payment total (${reconciliationCheck.paymentTotal}) doesn't match transaction total (${reconciliationCheck.ledgerAmount})`
        )
    }

    return NextResponse.json({
        // Transaction header
        transaction: {
            id: transaction.id,
            invoiceNumber: transaction.invoiceNumber,
            type: transaction.type,
            status: transaction.status,
            paymentMethod: transaction.paymentMethod,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            tip: transaction.tip,
            discount: transaction.discount,
            total: transaction.total,
            cashAmount: transaction.cashAmount,
            cardAmount: transaction.cardAmount,
            createdAt: transaction.createdAt,
            source: transaction.source
        },

        // Related entities
        franchise: transaction.franchise,
        client: transaction.client,
        employee: transaction.employee,

        // Line items with frozen snapshots
        lineItems: transaction.lineItems.map(item => ({
            id: item.id,
            type: item.type,
            service: item.service,
            product: item.product,
            staff: item.staff,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            total: item.total,
            // Frozen snapshot fields
            serviceNameSnapshot: item.serviceNameSnapshot,
            productNameSnapshot: item.productNameSnapshot,
            priceCharged: item.priceCharged,
            taxAllocated: item.taxAllocated,
            tipAllocated: item.tipAllocated,
            commissionAmount: item.commissionAmount,
            lineItemStatus: item.lineItemStatus
        })),

        // Tax breakdown
        taxLines: transaction.taxLines,

        // Refund chain
        linkedTransactions: {
            originalTransaction: transaction.originalTransaction,
            refunds: transaction.refunds
        },

        // Shift/Drawer impact
        shiftImpact: {
            cashDrawerSessionId: transaction.cashDrawerSessionId,
            drawerChange: reportBuckets.drawerImpact,
            drawerActivities: transaction.drawerActivities
        },

        // WHERE THIS TRANSACTION APPEARS IN REPORTS
        reportBuckets,

        // Reconciliation status
        reconciliation: reconciliationCheck
    })
}
