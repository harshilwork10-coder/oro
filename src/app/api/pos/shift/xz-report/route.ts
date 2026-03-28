import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pos/shift/xz-report — Generate X or Z report
 * X = mid-shift snapshot, Z = end-of-shift final
 * Query: ?shiftId=xxx&type=X|Z
 */
export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
    const locationId = dbUser?.locationId
    if (!locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const reportType = searchParams.get('type') || 'X'

    try {
        let shift: any
        if (shiftId) {
            shift = await prisma.cashDrawerSession.findFirst({
                where: { id: shiftId, locationId },
                include: { employee: { select: { name: true } } }
            })
        } else {
            shift = await prisma.cashDrawerSession.findFirst({
                where: { locationId, employeeId: user.id, status: 'OPEN' },
                include: { employee: { select: { name: true } } }
            })
        }

        if (!shift) return NextResponse.json({ error: 'No shift found' }, { status: 404 })

        // Get transactions
        const transactions = await prisma.transaction.findMany({
            where: { cashDrawerSessionId: shift.id, status: 'COMPLETED' },
            select: { total: true, subtotal: true, tax: true, paymentMethod: true, createdAt: true }
        })

        // Get cash drops
        const cashDrops = await prisma.cashDrop.findMany({
            where: { sessionId: shift.id },
            select: { amount: true, reason: true, createdAt: true }
        })

        // Get drawer activities
        const activities = await prisma.drawerActivity.findMany({
            where: { shiftId: shift.id },
            select: { type: true, amount: true, reason: true, timestamp: true }
        })

        // Calculate payment breakdown
        const paymentBreakdown: Record<string, { count: number, total: number }> = {
            CASH: { count: 0, total: 0 },
            CREDIT_CARD: { count: 0, total: 0 },
            DEBIT_CARD: { count: 0, total: 0 },
            SPLIT: { count: 0, total: 0 },
            EBT: { count: 0, total: 0 },
            OTHER: { count: 0, total: 0 }
        }

        let totalSales = 0
        let totalTax = 0

        for (const tx of transactions) {
            const total = Number(tx.total || 0)
            const tax = Number(tx.tax || 0)
            totalSales += total
            totalTax += tax

            const method = tx.paymentMethod || 'OTHER'
            if (method in paymentBreakdown) {
                paymentBreakdown[method].count++
                paymentBreakdown[method].total += total
            } else {
                paymentBreakdown.OTHER.count++
                paymentBreakdown.OTHER.total += total
            }
        }

        // Cash accountability
        const startingCash = Number(shift.startingCash || 0)
        const totalCashDrops = cashDrops.reduce((s, d) => s + Number(d.amount || 0), 0)
        const cashPayments = paymentBreakdown.CASH.total
        const expectedCash = startingCash + cashPayments - totalCashDrops
        const endingCash = shift.endingCash ? Number(shift.endingCash) : null
        const variance = endingCash !== null ? endingCash - expectedCash : null

        const noSaleCount = activities.filter((a: any) => a.type === 'NO_SALE').length

        const report = {
            reportType,
            shiftId: shift.id,
            employee: shift.employee?.name || 'Unknown',
            status: shift.status,
            openedAt: shift.startTime,
            closedAt: shift.endTime,

            transactionCount: transactions.length,
            totalSales: Math.round(totalSales * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            netSales: Math.round((totalSales - totalTax) * 100) / 100,

            paymentBreakdown: Object.fromEntries(
                Object.entries(paymentBreakdown).map(([k, v]) => [k, {
                    count: v.count,
                    total: Math.round(v.total * 100) / 100
                }])
            ),

            startingCash,
            cashPayments: Math.round(cashPayments * 100) / 100,
            totalCashDrops: Math.round(totalCashDrops * 100) / 100,
            cashDropDetails: cashDrops,
            expectedCash: Math.round(expectedCash * 100) / 100,
            endingCash,
            variance: variance !== null ? Math.round(variance * 100) / 100 : null,

            noSaleCount,
            drawerActivities: activities
        }

        return NextResponse.json({ report })
    } catch (error: any) {
        console.error('[XZ_REPORT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
