import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Reconciliation Triangle API
 * 
 * The "Reconciliation Triangle" - these 3 must match:
 * 1) Ledger totals - Sum of transactions by type
 * 2) Payment totals - Cash + Card + GiftCard = Net Sales
 * 3) Shift totals - Expected drawer movement matches actuals
 * 
 * If they don't tie, you'll get disputes and "your reports are wrong" claims.
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const franchiseId = searchParams.get('franchiseId')
    const date = searchParams.get('date') // YYYY-MM-DD format

    if (!franchiseId) {
        return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 })
    }

    // Parse date range
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // ═══════════════════════════════════════════════════════════════
    // 1. LEDGER TOTALS - From Transaction table by type
    // ═══════════════════════════════════════════════════════════════

    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay }
        },
        select: {
            id: true,
            type: true,
            status: true,
            total: true,
            tax: true,
            tip: true,
            cashAmount: true,
            cardAmount: true,
            paymentMethod: true
        }
    })

    let ledgerTotals = {
        grossSales: 0,
        refunds: 0,
        voids: 0,
        tipAdjustments: 0,
        payIns: 0,
        payOuts: 0,
        netSales: 0,
        taxCollected: 0,
        tipsCollected: 0,
        transactionCount: 0
    }

    for (const tx of transactions) {
        const amount = parseFloat(tx.total.toString())
        const tax = parseFloat(tx.tax.toString())
        const tip = parseFloat(tx.tip.toString())

        // Categorize by type (enum) or status (legacy)
        const isRefund = tx.type === 'REFUND' || tx.status === 'REFUNDED'
        const isVoid = tx.type === 'VOID' || tx.status === 'VOIDED'
        const isTipAdjust = tx.type === 'TIP_ADJUST'
        const isPayIn = tx.type === 'PAYIN'
        const isPayOut = tx.type === 'PAYOUT'

        if (isVoid) {
            ledgerTotals.voids += amount
        } else if (isRefund) {
            ledgerTotals.refunds += amount // Refunds are stored as positive, treated as negative
        } else if (isTipAdjust) {
            ledgerTotals.tipAdjustments += amount
        } else if (isPayIn) {
            ledgerTotals.payIns += amount
        } else if (isPayOut) {
            ledgerTotals.payOuts += amount
        } else {
            // Regular SALE
            ledgerTotals.grossSales += amount
            ledgerTotals.taxCollected += tax
            ledgerTotals.tipsCollected += tip
            ledgerTotals.transactionCount++
        }
    }

    ledgerTotals.netSales = ledgerTotals.grossSales - ledgerTotals.refunds - ledgerTotals.voids

    // ═══════════════════════════════════════════════════════════════
    // 2. PAYMENT TOTALS - Sum by payment method
    // ═══════════════════════════════════════════════════════════════

    let paymentTotals = {
        cash: 0,
        card: 0,
        giftCard: 0,
        split: 0,
        total: 0
    }

    for (const tx of transactions) {
        const isVoid = tx.type === 'VOID' || tx.status === 'VOIDED'
        const isRefund = tx.type === 'REFUND' || tx.status === 'REFUNDED'
        if (isVoid) continue // Voids don't count toward payment

        const cashAmt = parseFloat(tx.cashAmount?.toString() || '0')
        const cardAmt = parseFloat(tx.cardAmount?.toString() || '0')
        const total = parseFloat(tx.total.toString())

        const multiplier = isRefund ? -1 : 1

        if (tx.paymentMethod === 'CASH') {
            paymentTotals.cash += total * multiplier
        } else if (tx.paymentMethod === 'CREDIT_CARD' || tx.paymentMethod === 'DEBIT_CARD') {
            paymentTotals.card += total * multiplier
        } else if (tx.paymentMethod === 'GIFT_CARD') {
            paymentTotals.giftCard += total * multiplier
        } else if (tx.paymentMethod === 'SPLIT') {
            paymentTotals.cash += cashAmt * multiplier
            paymentTotals.card += cardAmt * multiplier
            paymentTotals.split += total * multiplier
        }
    }

    paymentTotals.total = paymentTotals.cash + paymentTotals.card + paymentTotals.giftCard

    // ═══════════════════════════════════════════════════════════════
    // 3. SHIFT / DRAWER TOTALS
    // ═══════════════════════════════════════════════════════════════

    const drawerSessions = await prisma.cashDrawerSession.findMany({
        where: {
            franchiseId,
            startTime: { gte: startOfDay, lte: endOfDay }
        },
        select: {
            id: true,
            startBalance: true,
            expectedCash: true,
            actualCash: true,
            cashDrops: true,
            status: true
        }
    })

    let shiftTotals = {
        startingCash: 0,
        expectedCashChange: 0,
        cashSales: paymentTotals.cash,
        cashRefunds: 0,
        payIns: ledgerTotals.payIns,
        payOuts: ledgerTotals.payOuts,
        netCashChange: 0,
        actualCash: 0,
        variance: 0
    }

    for (const session of drawerSessions) {
        shiftTotals.startingCash += parseFloat(session.startBalance?.toString() || '0')
        shiftTotals.expectedCashChange += parseFloat(session.expectedCash?.toString() || '0') -
            parseFloat(session.startBalance?.toString() || '0')
        if (session.actualCash) {
            shiftTotals.actualCash += parseFloat(session.actualCash.toString())
        }
    }

    // Calculate expected cash change: cash sales + payins - payouts - cash refunds
    shiftTotals.netCashChange = shiftTotals.cashSales + shiftTotals.payIns -
        shiftTotals.payOuts - shiftTotals.cashRefunds

    // ═══════════════════════════════════════════════════════════════
    // 4. RECONCILIATION CHECK
    // ═══════════════════════════════════════════════════════════════

    const discrepancies: string[] = []

    // Check 1: Ledger net sales should match payment total
    const ledgerPaymentDiff = Math.abs(ledgerTotals.netSales - paymentTotals.total)
    if (ledgerPaymentDiff > 0.01) {
        discrepancies.push(
            `Ledger net sales ($${ledgerTotals.netSales.toFixed(2)}) doesn't match payment total ($${paymentTotals.total.toFixed(2)}). Difference: $${ledgerPaymentDiff.toFixed(2)}`
        )
    }

    // Check 2: Cash movement should tie to drawer
    if (drawerSessions.length > 0 && shiftTotals.actualCash > 0) {
        const drawerDiff = Math.abs(shiftTotals.netCashChange - shiftTotals.expectedCashChange)
        if (drawerDiff > 0.01) {
            discrepancies.push(
                `Calculated cash change ($${shiftTotals.netCashChange.toFixed(2)}) doesn't match drawer expected ($${shiftTotals.expectedCashChange.toFixed(2)})`
            )
        }

        const varianceDiff = Math.abs(shiftTotals.actualCash - (shiftTotals.startingCash + shiftTotals.netCashChange))
        if (varianceDiff > 0.01) {
            shiftTotals.variance = varianceDiff
            discrepancies.push(
                `Drawer variance detected: $${varianceDiff.toFixed(2)} (expected vs actual)`
            )
        }
    }

    const balanced = discrepancies.length === 0

    return NextResponse.json({
        date: targetDate.toISOString().split('T')[0],
        franchiseId,

        // The Triangle
        ledgerTotals,
        paymentTotals,
        shiftTotals,

        // Reconciliation result
        balanced,
        discrepancies,

        // Summary
        summary: {
            totalTransactions: transactions.length,
            drawerSessions: drawerSessions.length,
            status: balanced ? '✅ BALANCED' : '⚠️ DISCREPANCIES FOUND'
        }
    })
}
