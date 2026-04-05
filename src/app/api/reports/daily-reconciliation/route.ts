import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================
// DAILY RECONCILIATION — Single Source of Financial Truth
// ============================================================
//
// GET /api/reports/daily-reconciliation?date=2026-04-04&locationId=xxx
//
// Returns:
//   - Sales / Refunds / Corrections / Voids
//   - Tender breakdown (cash, card, gift card, store credit, split)
//   - Gift card + store credit liability
//   - Cash drawer: expected vs actual, variance
//   - Integrity check: do sales - refunds = tender total - refund tenders?
//   - Alerts for anomalies
//
// ============================================================

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const locationId = searchParams.get('locationId')

    // Date range for the requested day
    const dayStart = new Date(dateStr + 'T00:00:00.000Z')
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z')

    const fid = user.franchiseId
    const baseWhere = {
        franchiseId: fid,
        createdAt: { gte: dayStart, lte: dayEnd },
        ...(locationId ? { cashDrawerSession: { locationId } } : {})
    }

    try {
        // ===== SALES =====
        const salesAgg = await prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'SALE', status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED', 'CORRECTED'] } },
            _sum: { total: true, tax: true, tip: true, discount: true },
            _count: true
        })

        // ===== REFUNDS (child rows with type REFUND) =====
        const refundsAgg = await prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'REFUND' },
            _sum: { total: true },
            _count: true
        })

        // ===== CORRECTIONS (child rows with type CORRECTION) =====
        const correctionsAgg = await prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'CORRECTION' },
            _sum: { total: true },
            _count: true
        })

        // ===== VOIDS (child rows with type VOID — new model) =====
        const voidsNewAgg = await prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'VOID' },
            _sum: { total: true },
            _count: true
        })
        // Legacy voids (status=VOIDED but no child row — pre-migration)
        const voidsLegacyAgg = await prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'SALE', status: 'VOIDED' },
            _sum: { total: true },
            _count: true
        })

        // ===== TENDER BREAKDOWN =====
        const tenderMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'SPLIT']
        const tenders: Record<string, number> = {}
        for (const method of tenderMethods) {
            const agg = await prisma.transaction.aggregate({
                where: { ...baseWhere, type: 'SALE', status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED', 'CORRECTED'] }, paymentMethod: method },
                _sum: { total: true }
            })
            tenders[method.toLowerCase()] = Number(agg._sum.total || 0)
        }

        // ===== GIFT CARD + STORE CREDIT LIABILITY =====
        const gcLiab = await prisma.giftCard.aggregate({
            where: { franchiseId: fid, isActive: true, code: { not: { startsWith: 'SC-' } } },
            _sum: { currentBalance: true }
        })
        const scLiab = await prisma.giftCard.aggregate({
            where: { franchiseId: fid, isActive: true, code: { startsWith: 'SC-' } },
            _sum: { currentBalance: true }
        })

        // ===== CASH DRAWER SESSIONS =====
        const locationWhere = locationId ? { locationId } : { location: { franchiseId: fid } }
        const sessions = await prisma.cashDrawerSession.findMany({
            where: {
                ...locationWhere,
                startTime: { gte: dayStart, lte: dayEnd },
            },
            include: {
                cashDrops: { select: { amount: true } },
            }
        })

        const drawerSummary = {
            totalSessions: sessions.length,
            startingCash: sessions.reduce((s, sess) => s + Number(sess.startingCash || 0), 0),
            endingCash: sessions.reduce((s, sess) => s + Number(sess.endingCash || 0), 0),
            expectedCash: sessions.reduce((s, sess) => s + Number(sess.expectedCash || 0), 0),
            variance: sessions.reduce((s, sess) => s + Number(sess.variance || 0), 0),
            cashDrops: sessions.reduce((s, sess) => s + sess.cashDrops.reduce((ds, d) => ds + Number(d.amount || 0), 0), 0),
        }

        // Paid in/out
        const paidInAgg = await prisma.drawerActivity.aggregate({
            where: { type: 'PAID_IN', timestamp: { gte: dayStart, lte: dayEnd }, ...(locationId ? { locationId } : {}) },
            _sum: { amount: true }
        })
        const paidOutAgg = await prisma.drawerActivity.aggregate({
            where: { type: 'PAID_OUT', timestamp: { gte: dayStart, lte: dayEnd }, ...(locationId ? { locationId } : {}) },
            _sum: { amount: true }
        })

        // ===== COMPUTE TOTALS =====
        const salesTotal = Number(salesAgg._sum.total || 0)
        const refundsTotal = Math.abs(Number(refundsAgg._sum.total || 0))
        const correctionsTotal = Math.abs(Number(correctionsAgg._sum.total || 0))
        const voidsTotal = Math.abs(Number(voidsNewAgg._sum.total || 0)) + Number(voidsLegacyAgg._sum.total || 0)
        const netRevenue = salesTotal - refundsTotal - correctionsTotal
        const tenderTotal = Object.values(tenders).reduce((s, v) => s + v, 0)
        const tenderDrift = Math.round((tenderTotal - salesTotal) * 100) / 100

        const paidIn = Number(paidInAgg._sum.amount || 0)
        const paidOut = Number(paidOutAgg._sum.amount || 0)

        // ===== ALERTS =====
        const alerts: { type: string; message: string; severity: 'info' | 'warn' | 'critical' }[] = []

        if (Math.abs(drawerSummary.variance) > 20) {
            alerts.push({ type: 'VARIANCE', message: `Drawer variance of $${drawerSummary.variance.toFixed(2)}`, severity: 'critical' })
        } else if (Math.abs(drawerSummary.variance) > 5) {
            alerts.push({ type: 'VARIANCE', message: `Drawer variance of $${drawerSummary.variance.toFixed(2)}`, severity: 'warn' })
        }

        if (Math.abs(tenderDrift) > 0.01) {
            alerts.push({ type: 'TENDER_DRIFT', message: `Tender total ($${tenderTotal.toFixed(2)}) does not match sales total ($${salesTotal.toFixed(2)})`, severity: 'critical' })
        }

        if (correctionsAgg._count > 0) {
            alerts.push({ type: 'CORRECTIONS', message: `${correctionsAgg._count} late correction(s) totaling $${correctionsTotal.toFixed(2)}`, severity: 'warn' })
        }

        const gcBalance = Number(gcLiab._sum.currentBalance || 0)
        const scBalance = Number(scLiab._sum.currentBalance || 0)
        if (gcBalance < 0) alerts.push({ type: 'GC_NEGATIVE', message: `Gift card liability is negative: $${gcBalance.toFixed(2)}`, severity: 'critical' })
        if (scBalance < 0) alerts.push({ type: 'SC_NEGATIVE', message: `Store credit liability is negative: $${scBalance.toFixed(2)}`, severity: 'critical' })

        // ===== INTEGRITY CHECK =====
        const integrity = {
            salesMinusReversals: Math.round(netRevenue * 100) / 100,
            tenderMinusReversals: Math.round((tenderTotal - refundsTotal - correctionsTotal) * 100) / 100,
            match: Math.abs(netRevenue - (tenderTotal - refundsTotal - correctionsTotal)) < 0.02,
        }

        return NextResponse.json({
            date: dateStr,
            locationId: locationId || 'ALL',
            sales: { count: salesAgg._count, total: salesTotal, tax: Number(salesAgg._sum.tax || 0), tip: Number(salesAgg._sum.tip || 0), discount: Number(salesAgg._sum.discount || 0) },
            refunds: { count: refundsAgg._count, total: -refundsTotal },
            corrections: { count: correctionsAgg._count, total: -correctionsTotal },
            voids: { count: (voidsNewAgg._count + voidsLegacyAgg._count), total: voidsTotal, newModel: voidsNewAgg._count, legacy: voidsLegacyAgg._count },
            netRevenue,
            tenders: {
                cash: tenders['cash'],
                creditCard: tenders['credit_card'],
                debitCard: tenders['debit_card'],
                giftCard: tenders['gift_card'],
                split: tenders['split'],
            },
            tenderTotal,
            tenderDrift,
            giftCardLiability: gcBalance,
            storeCreditLiability: scBalance,
            cashDrawer: {
                sessions: drawerSummary.totalSessions,
                startingCash: drawerSummary.startingCash,
                endingCash: drawerSummary.endingCash,
                expectedCash: drawerSummary.expectedCash,
                variance: drawerSummary.variance,
                cashDrops: drawerSummary.cashDrops,
                paidIn,
                paidOut,
            },
            alerts,
            integrity,
        })
    } catch (error: any) {
        console.error('[DAILY_RECONCILIATION]', error)
        return NextResponse.json({ error: 'Failed to generate reconciliation' }, { status: 500 })
    }
}
