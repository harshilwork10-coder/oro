import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        // Date ranges
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        const weekStart = new Date(todayStart)
        weekStart.setDate(weekStart.getDate() - 7)
        const monthStart = new Date(todayStart)
        monthStart.setMonth(monthStart.getMonth() - 1)

        // ── TODAY ──────────────────────────────────────────────────────
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: 'COMPLETED'
            },
            select: {
                tip: true,
                total: true,
                paymentMethod: true,
                discount: true
            }
        })

        // Today's line items (for commission, revenue by staff)
        const todayLineItems = await prisma.transactionLineItem.findMany({
            where: {
                staffId: userId,
                transaction: {
                    createdAt: { gte: todayStart, lte: todayEnd },
                    status: 'COMPLETED'
                }
            },
            select: {
                total: true,
                priceCharged: true,
                commissionAmount: true,
                commissionSplitUsed: true,
                tipAllocated: true,
                type: true
            }
        })

        // ── WEEK ──────────────────────────────────────────────────────
        const weekTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: { gte: weekStart, lte: todayEnd },
                status: 'COMPLETED'
            },
            select: { tip: true, total: true }
        })

        const weekLineItems = await prisma.transactionLineItem.findMany({
            where: {
                staffId: userId,
                transaction: {
                    createdAt: { gte: weekStart, lte: todayEnd },
                    status: 'COMPLETED'
                }
            },
            select: { commissionAmount: true }
        })

        // ── MONTH ─────────────────────────────────────────────────────
        const monthTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: { gte: monthStart, lte: todayEnd },
                status: 'COMPLETED'
            },
            select: { tip: true, total: true }
        })

        const monthLineItems = await prisma.transactionLineItem.findMany({
            where: {
                staffId: userId,
                transaction: {
                    createdAt: { gte: monthStart, lte: todayEnd },
                    status: 'COMPLETED'
                }
            },
            select: { commissionAmount: true }
        })

        // ── APPOINTMENTS ──────────────────────────────────────────────
        const todayAppointments = await prisma.appointment.findMany({
            where: {
                employeeId: userId,
                startTime: { gte: todayStart, lte: todayEnd }
            },
            select: { status: true, clientId: true }
        })

        // ── AUDIT DATA ────────────────────────────────────────────────
        const todayVoids = await prisma.transaction.count({
            where: {
                employeeId: userId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: 'VOIDED'
            }
        })

        const todayRefundedTxns = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: 'REFUNDED'
            },
            select: { total: true }
        })

        // ── CALCULATIONS ──────────────────────────────────────────────

        // Revenue
        const revenueToday = todayTransactions.reduce((s, t) => s + (Number(t.total) || 0), 0)
        const revenueWeek = weekTransactions.reduce((s, t) => s + (Number(t.total) || 0), 0)
        const revenueMonth = monthTransactions.reduce((s, t) => s + (Number(t.total) || 0), 0)

        // Tips by period
        const tipsToday = todayTransactions.reduce((s, t) => s + (Number(t.tip) || 0), 0)
        const tipsWeek = weekTransactions.reduce((s, t) => s + (Number(t.tip) || 0), 0)
        const tipsMonth = monthTransactions.reduce((s, t) => s + (Number(t.tip) || 0), 0)

        // Tips breakdown by payment method (real data)
        const cashTips = todayTransactions
            .filter(t => t.paymentMethod === 'CASH')
            .reduce((s, t) => s + (Number(t.tip) || 0), 0)
        const cardTips = todayTransactions
            .filter(t => t.paymentMethod !== 'CASH')
            .reduce((s, t) => s + (Number(t.tip) || 0), 0)

        // Commission from line items (REAL calculated commission, not estimated)
        const commissionToday = todayLineItems.reduce((s, li) => s + (Number(li.commissionAmount) || 0), 0)
        const commissionWeek = weekLineItems.reduce((s, li) => s + (Number(li.commissionAmount) || 0), 0)
        const commissionMonth = monthLineItems.reduce((s, li) => s + (Number(li.commissionAmount) || 0), 0)

        // Get the most common commission split % used (for display purposes)
        const splits = todayLineItems
            .map(li => Number(li.commissionSplitUsed) || 0)
            .filter(s => s > 0)
        const commissionRatePercent = splits.length > 0
            ? Math.round(splits.reduce((a, b) => a + b, 0) / splits.length)
            : 0

        // Product vs Service commission breakdown from line items
        const serviceRevenue = todayLineItems
            .filter(li => li.type !== 'PRODUCT')
            .reduce((s, li) => s + (Number(li.priceCharged || li.total) || 0), 0)
        const productRevenue = todayLineItems
            .filter(li => li.type === 'PRODUCT')
            .reduce((s, li) => s + (Number(li.priceCharged || li.total) || 0), 0)
        const serviceCommission = todayLineItems
            .filter(li => li.type !== 'PRODUCT')
            .reduce((s, li) => s + (Number(li.commissionAmount) || 0), 0)
        const productCommission = todayLineItems
            .filter(li => li.type === 'PRODUCT')
            .reduce((s, li) => s + (Number(li.commissionAmount) || 0), 0)

        // Discounts
        const discountsToday = todayTransactions.reduce((s, t) => s + (Number(t.discount) || 0), 0)
        const refundsTotal = todayRefundedTxns.reduce((s, t) => s + (Number(t.total) || 0), 0)

        // Performance
        const servicesCompleted = todayAppointments.filter(a =>
            a.status === 'COMPLETED' || a.status === 'IN_PROGRESS'
        ).length
        const uniqueClients = new Set(todayAppointments.filter(a => a.clientId).map(a => a.clientId)).size
        const avgTicket = todayTransactions.length > 0 ? revenueToday / todayTransactions.length : 0

        // ── RESPONSE ──────────────────────────────────────────────────
        const r = (v: number) => Math.round(v * 100) / 100

        return NextResponse.json({
            // Revenue by period
            revenueToday: r(revenueToday),
            revenueWeek: r(revenueWeek),
            revenueMonth: r(revenueMonth),

            // Tips by period
            tipsToday: r(tipsToday),
            tipsWeek: r(tipsWeek),
            tipsMonth: r(tipsMonth),

            // Tips breakdown by payment method
            cashTips: r(cashTips),
            cardTips: r(cardTips),

            // Commission (from actual line item data)
            commissionToday: r(commissionToday),
            commissionWeek: r(commissionWeek),
            commissionMonth: r(commissionMonth),
            commissionRatePercent,

            // Commission breakdown by type
            serviceRevenue: r(serviceRevenue),
            serviceCommission: r(serviceCommission),
            productRevenue: r(productRevenue),
            productCommission: r(productCommission),

            // Performance
            servicesCompleted,
            clientsServed: uniqueClients,
            avgTicket: r(avgTicket),
            transactionCount: todayTransactions.length,

            // Audit data
            discountsGiven: r(discountsToday),
            voidsCount: todayVoids,
            refundsTotal: r(refundsTotal),
            refundsCount: todayRefundedTxns.length,
        })
    } catch (error) {
        console.error('Error fetching employee reports:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}
