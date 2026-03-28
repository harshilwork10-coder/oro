/**
 * Loss Prevention Dashboard API
 *
 * GET — Aggregated security overview: void/refund rates, no-sale drawer opens,
 *        cash variance, waste losses, and composite risk score
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role || '')) {
            return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
        }

        const franchiseId = user.franchiseId

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Parallel data fetch — scoped by franchise
        const [voids, refunds, noSales, cashSessions, totalTx] = await Promise.all([
            prisma.transaction.count({
                where: { franchiseId, status: 'VOIDED', createdAt: { gte: since } }
            }),
            prisma.transaction.count({
                where: { franchiseId, status: 'REFUNDED', createdAt: { gte: since } }
            }),
            prisma.drawerActivity.count({
                where: { location: { franchiseId }, type: 'NO_SALE', timestamp: { gte: since } }
            }).catch(() => 0),
            prisma.cashDrawerSession.findMany({
                where: { location: { franchiseId }, status: 'CLOSED', endTime: { gte: since } },
                select: { variance: true }
            }),
            prisma.transaction.count({
                where: { franchiseId, status: 'COMPLETED', createdAt: { gte: since } }
            })
        ])

        // Calculate cash variance
        const totalVariance = cashSessions.reduce((s, cs) => s + Math.abs(Number(cs.variance || 0)), 0)
        const shortShifts = cashSessions.filter(cs => Number(cs.variance || 0) < -1).length

        // Risk score (0-100)
        const voidRate = totalTx > 0 ? (voids / totalTx) * 100 : 0
        const refundRate = totalTx > 0 ? (refunds / totalTx) * 100 : 0
        const riskScore = Math.min(100, Math.round(
            (voidRate > 5 ? 20 : voidRate > 2 ? 10 : 0) +
            (refundRate > 5 ? 20 : refundRate > 2 ? 10 : 0) +
            (noSales > 10 ? 20 : noSales > 5 ? 10 : 0) +
            (shortShifts > 2 ? 20 : shortShifts > 0 ? 10 : 0)
        ))

        const alerts: { severity: string; message: string }[] = []
        if (voidRate > 5) alerts.push({ severity: 'CRITICAL', message: `Void rate ${voidRate.toFixed(1)}% — above 5% threshold` })
        if (refundRate > 5) alerts.push({ severity: 'CRITICAL', message: `Refund rate ${refundRate.toFixed(1)}% — above 5% threshold` })
        if (noSales > 10) alerts.push({ severity: 'WARNING', message: `${noSales} no-sale drawer opens this period` })
        if (shortShifts > 0) alerts.push({ severity: 'WARNING', message: `${shortShifts} shifts closed short (cash variance)` })

        return NextResponse.json({
            dashboard: {
                riskScore,
                riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
                voidCount: voids,
                refundCount: refunds,
                voidRate: Math.round(voidRate * 10) / 10,
                refundRate: Math.round(refundRate * 10) / 10,
                noSaleCount: noSales,
                cashVariance: Math.round(totalVariance * 100) / 100,
                shortShifts,
                totalTransactions: totalTx,
                alerts
            },
            periodDays: days
        })
    } catch (error) {
        console.error('[LOSS_PREV_GET]', error)
        return NextResponse.json({ error: 'Failed to generate loss prevention dashboard' }, { status: 500 })
    }
}
