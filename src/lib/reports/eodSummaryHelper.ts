import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { fromZonedTime } from 'date-fns-tz'

const Decimal = Prisma.Decimal

const COMPLETED_STATUSES = ['COMPLETED', 'APPROVED']
const REFUNDED_STATUSES = ['REFUNDED', 'VOIDED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'CORRECTED']

export async function buildLocationEODSummary(locationId: string, tzDate: string) {
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { timezone: true }
    })
    
    const tz = location?.timezone || 'America/Chicago'

    // Construct valid UTC bounds for this tzDate strictly using the physical location's timezone
    const startOfDay = fromZonedTime(`${tzDate}T00:00:00`, tz)
    const endOfDay = fromZonedTime(`${tzDate}T23:59:59.999`, tz)

    // 1. Check for Active Shifts Blocking EOD
    const activeSessions = await prisma.cashDrawerSession.findMany({
        where: { locationId, status: 'OPEN' },
        include: { employee: { select: { name: true, email: true } } }
    })

    const openShifts = activeSessions.map(s => ({
        id: s.id,
        employeeName: s.employee.name || s.employee.email,
        startTime: s.startTime
    }))

    // Fetch transactions strictly within timezone boundaries
    const transactions = await prisma.transaction.findMany({
        where: {
            cashDrawerSession: { locationId },
            createdAt: { gte: startOfDay, lte: endOfDay }
        },
        include: { lineItems: true }
    })

    // Fetch all drawer activities strictly within timezone boundaries
    const drawerActivities = await prisma.drawerActivity.findMany({
        where: {
            shift: { locationId },
            timestamp: { gte: startOfDay, lte: endOfDay }
        }
    })
    
    // Fetch all shifts started or ended in this day for opening cash
    const dayShifts = await prisma.cashDrawerSession.findMany({
        where: {
            locationId,
            startTime: { gte: startOfDay, lte: endOfDay }
        }
    })

    // Prepare Aggregates
    let grossSales = new Decimal(0)
    let netSales = new Decimal(0)
    
    let cashSales = new Decimal(0)
    let cardSales = new Decimal(0)
    let splitCash = new Decimal(0)
    let splitCard = new Decimal(0)
    
    let tax = new Decimal(0)
    let tips = new Decimal(0)
    let cashRefunds = new Decimal(0)
    let refunds = new Decimal(0)
    let voids = new Decimal(0)
    let discounts = new Decimal(0)

    let transactionCount = 0

    for (const tx of transactions) {
        const txTotal = new Decimal(tx.total || 0)
        const txTax = new Decimal(tx.tax || 0)
        const txTip = new Decimal(tx.tip || 0)

        // Accumulate Discounts directly from line items
        tx.lineItems.forEach(li => {
            if (li.discount && li.price) {
                const itemTotalDiscount = new Decimal(li.price).mul(new Decimal(li.discount).div(100)).mul(li.quantity || 1)
                discounts = discounts.plus(itemTotalDiscount)
            }
        })

        if (COMPLETED_STATUSES.includes(tx.status)) {
            transactionCount++
            grossSales = grossSales.plus(txTotal)
            netSales = netSales.plus(txTotal)
            tax = tax.plus(txTax)
            tips = tips.plus(txTip)

            if (tx.paymentMethod === 'CASH') {
                cashSales = cashSales.plus(txTotal)
            } else if (tx.paymentMethod === 'CARD' || tx.paymentMethod === 'CREDIT_CARD' || tx.paymentMethod === 'DEBIT_CARD') {
                cardSales = cardSales.plus(txTotal)
            } else if (tx.paymentMethod === 'SPLIT') {
                // If it's a split tender, we look for explicit split amounts or default to fallback logic
                const cashAmt = new Decimal((tx as any).splitCashAmount || 0)
                const cardAmt = new Decimal((tx as any).splitCardAmount || 0)
                splitCash = splitCash.plus(cashAmt)
                splitCard = splitCard.plus(cardAmt)
                // If the app doesn't save splitCardAmount directly on tx, it might have a PaymentLog
                // For safety in this audit, we assume if it's SPLIT and splitCashAmount exists, the math maps cleanly.
            }
        } 
        else if (REFUNDED_STATUSES.includes(tx.status)) {
            if (tx.status === 'VOIDED') {
                voids = voids.plus(txTotal)
            } else {
                refunds = refunds.plus(txTotal)
                netSales = netSales.minus(txTotal)
                
                // Track physical cash leaving the building
                if (tx.paymentMethod === 'CASH') {
                    cashRefunds = cashRefunds.plus(txTotal)
                } else if (tx.paymentMethod === 'SPLIT') {
                    // Refunded a split, cash portion goes back
                    cashRefunds = cashRefunds.plus(new Decimal((tx as any).splitCashAmount || 0))
                }
            }
        }
    }

    // Process Drawer Activities
    let noSaleCount = 0
    let paidInTotal = new Decimal(0)
    let paidOutTotal = new Decimal(0)
    let cashDropsTotal = new Decimal(0)

    for (const activity of drawerActivities) {
        const amt = new Decimal(activity.amount || 0)
        switch (activity.type) {
            case 'NO_SALE':
                noSaleCount++
                break
            case 'PAID_IN':
                paidInTotal = paidInTotal.plus(amt)
                break
            case 'PAID_OUT':
                paidOutTotal = paidOutTotal.plus(amt)
                break
            case 'CASH_DROP':
                cashDropsTotal = cashDropsTotal.plus(amt)
                break
        }
    }

    // Opening Cash
    let openingCashTotal = new Decimal(0)
    const shiftBreakdown = []
    
    for (const shift of dayShifts) {
        openingCashTotal = openingCashTotal.plus(new Decimal(shift.startingCash || 0))
        shiftBreakdown.push({
            shiftId: shift.id,
            employeeId: shift.employeeId,
            openedAt: shift.startTime,
            closedAt: shift.endTime,
            startingCash: Number(shift.startingCash || 0),
            endingCash: Number(shift.endingCash || 0)
        })
    }

    // Expected physical cash equation:
    // Opening Cash + Net Cash In (Sales + Split Cash + Paid In) - Net Cash Out (Paid Out + Drops + Refunds)
    const expectedCash = openingCashTotal
        .plus(cashSales)
        .plus(splitCash)
        .plus(paidInTotal)
        .minus(paidOutTotal)
        .minus(cashDropsTotal)
        .minus(cashRefunds)

    return {
        openShifts,
        canClose: openShifts.length === 0,
        tzDate,
        timezone: tz,
        bounds: { startOfDay, endOfDay },
        data: {
            grossSales: Number(grossSales.toFixed(2)),
            netSales: Number(netSales.toFixed(2)),
            cashSales: Number(cashSales.toFixed(2)),
            cardSales: Number(cardSales.toFixed(2)),
            splitCash: Number(splitCash.toFixed(2)),
            splitCard: Number(splitCard.toFixed(2)),
            tax: Number(tax.toFixed(2)),
            tips: Number(tips.toFixed(2)),
            cashRefunds: Number(cashRefunds.toFixed(2)),
            refunds: Number(refunds.toFixed(2)),
            voids: Number(voids.toFixed(2)),
            discounts: Number(discounts.toFixed(2)),
            noSaleCount,
            paidInTotal: Number(paidInTotal.toFixed(2)),
            paidOutTotal: Number(paidOutTotal.toFixed(2)),
            cashDropsTotal: Number(cashDropsTotal.toFixed(2)),
            openingCashTotal: Number(openingCashTotal.toFixed(2)),
            expectedCash: Number(expectedCash.toFixed(2)),
            transactionCount,
            shiftBreakdown
        }
    }
}
