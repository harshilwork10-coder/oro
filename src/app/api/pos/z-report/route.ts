import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// AUDIT STANDARD: Proper decimal rounding to prevent penny errors
function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
}

// GET /api/pos/z-report - Get Z-Report data for today
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const today = new Date()
        const dayStart = startOfDay(today)
        const dayEnd = endOfDay(today)

        // Get all transactions for today
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                createdAt: {
                    gte: dayStart,
                    lte: dayEnd
                }
            },
            select: {
                id: true,
                total: true,
                subtotal: true,
                tax: true,
                tip: true,
                status: true,
                paymentMethod: true,
                discount: true,
                createdAt: true
            }
        })

        // Calculate totals
        let grossSales = 0
        let netSales = 0
        let taxCollected = 0
        let tipsCollected = 0
        let cashSales = 0
        let cardSales = 0
        let otherSales = 0
        let refundAmount = 0
        let completedCount = 0
        let voidedCount = 0
        let refundedCount = 0

        for (const tx of transactions) {
            const total = Number(tx.total) || 0
            const tax = Number(tx.tax) || 0
            const tip = Number(tx.tip) || 0

            // Check for completed transactions (include APPROVED status)
            if (tx.status === 'COMPLETED' || tx.status === 'APPROVED') {
                grossSales += total
                taxCollected += tax
                tipsCollected += tip
                completedCount++

                const paymentMethod = tx.paymentMethod?.toUpperCase() || ''
                if (paymentMethod.includes('CASH')) {
                    cashSales += total
                } else if (paymentMethod.includes('CARD') || paymentMethod.includes('CREDIT') || paymentMethod.includes('DEBIT')) {
                    cardSales += total
                } else {
                    otherSales += total
                }
            } else if (tx.status === 'VOIDED') {
                voidedCount++
            } else if (tx.status === 'REFUNDED' || tx.status === 'CANCELLED') {
                // Include both REFUNDED and CANCELLED in refund totals
                // Use Math.abs() because refund transactions may have negative totals
                refundAmount += Math.abs(total)
                refundedCount++
            }
        }

        // Apply proper rounding to all financial values
        netSales = roundCurrency(grossSales - refundAmount)
        grossSales = roundCurrency(grossSales)
        refundAmount = roundCurrency(refundAmount)
        taxCollected = roundCurrency(taxCollected)
        tipsCollected = roundCurrency(tipsCollected)
        cashSales = roundCurrency(cashSales)
        cardSales = roundCurrency(cardSales)
        otherSales = roundCurrency(otherSales)
        const totalWithTax = roundCurrency(netSales + taxCollected)
        const avgTicket = completedCount > 0 ? roundCurrency(grossSales / completedCount) : 0
        const totalTransactions = transactions.length

        return NextResponse.json({
            success: true,
            report: {
                date: today.toISOString(),

                // Sales Summary
                grossSales,
                refundAmount,
                netSales,
                taxCollected,
                tipsCollected,
                totalWithTax,

                // Payment Methods
                cashSales,
                cardSales,
                otherSales,

                // Transaction Counts
                totalTransactions,
                completedCount,
                voidedCount,
                refundedCount,

                // Metrics
                avgTicket
            }
        })
    } catch (error) {
        console.error('[API_ZREPORT_ERROR]', error)
        return NextResponse.json({ error: 'Failed to generate Z-Report' }, { status: 500 })
    }
}
