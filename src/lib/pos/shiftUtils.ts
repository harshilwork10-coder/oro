import { prisma } from '@/lib/prisma'

export interface ShiftSummary {
    startingCash: number
    cashSales: number
    splitCash: number
    cashRefunds: number
    cashDrops: number
    paidIn: number
    paidOut: number
    expectedCash: number
    noSalesCount: number
}

export async function computeShiftSummary(sessionId: string, startingCashInput?: number): Promise<ShiftSummary> {
    let startingCash = startingCashInput !== undefined ? startingCashInput : 0

    if (startingCashInput === undefined) {
        const session = await prisma.cashDrawerSession.findUnique({
            where: { id: sessionId },
            select: { startingCash: true }
        })
        startingCash = Number(session?.startingCash || 0)
    }

    // Cash sales during this shift
    const cashSalesAgg = await prisma.transaction.aggregate({
        where: { cashDrawerSessionId: sessionId, status: 'COMPLETED', paymentMethod: 'CASH' },
        _sum: { total: true }
    })
    const cashSales = Number(cashSalesAgg._sum.total || 0)

    // Cash refunds during this shift (negative totals, so abs)
    const cashRefundsAgg = await prisma.transaction.aggregate({
        where: { cashDrawerSessionId: sessionId, type: { in: ['REFUND', 'VOID', 'CORRECTION'] }, paymentMethod: 'CASH' },
        _sum: { total: true }
    })
    const cashRefunds = Math.abs(Number(cashRefundsAgg._sum.total || 0))

    // Cash drops
    const cashDropsAgg = await prisma.cashDrop.aggregate({
        where: { sessionId },
        _sum: { amount: true }
    })
    const cashDrops = Number(cashDropsAgg._sum.amount || 0)

    // Paid in
    const paidInAgg = await prisma.drawerActivity.aggregate({
        where: { shiftId: sessionId, type: 'PAID_IN' },
        _sum: { amount: true }
    })
    const paidIn = Number(paidInAgg._sum.amount || 0)

    // Paid out
    const paidOutAgg = await prisma.drawerActivity.aggregate({
        where: { shiftId: sessionId, type: 'PAID_OUT' },
        _sum: { amount: true }
    })
    const paidOut = Number(paidOutAgg._sum.amount || 0)

    // Split payment cash portions
    const splitCashAgg = await prisma.transaction.aggregate({
        where: { cashDrawerSessionId: sessionId, status: 'COMPLETED', paymentMethod: 'SPLIT' },
        _sum: { cashAmount: true }
    })
    const splitCash = Number(splitCashAgg._sum.cashAmount || 0)

    // No sales count
    const noSalesCount = await prisma.drawerActivity.count({
        where: { shiftId: sessionId, type: 'NO_SALE' }
    })

    const expectedCash = Math.round((startingCash + cashSales + splitCash - cashRefunds - cashDrops - paidOut + paidIn) * 100) / 100

    return {
        startingCash,
        cashSales,
        splitCash,
        cashRefunds,
        cashDrops,
        paidIn,
        paidOut,
        expectedCash,
        noSalesCount
    }
}
