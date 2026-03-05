// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Loss Prevention Dashboard (aggregated security overview)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Parallel data fetch
        const [voids, refunds, noSales, cashScores, wasteAdj, totalTx] = await Promise.all([
            prisma.transaction.count({ where: { locationId, status: 'VOIDED', createdAt: { gte: since } } }),
            prisma.transaction.count({ where: { locationId, status: 'REFUNDED', createdAt: { gte: since } } }),
            (prisma as any).drawerActivity.count({ where: { locationId, type: 'NO_SALE', timestamp: { gte: since } } }).catch(() => 0),
            prisma.cashDrawerSession.findMany({
                where: { locationId, status: 'CLOSED', endTime: { gte: since } },
                select: { variance: true }
            }),
            prisma.stockAdjustment.findMany({
                where: { locationId, reason: { startsWith: 'WASTE:' }, createdAt: { gte: since } },
                select: { quantity: true, item: { select: { cost: true } } }
            }),
            prisma.transaction.count({ where: { locationId, status: 'COMPLETED', createdAt: { gte: since } } })
        ])

        // Calculate cash variance
        const totalVariance = cashScores.reduce((s, cs) => s + Math.abs(Number(cs.variance || 0)), 0)
        const shortShifts = cashScores.filter(cs => Number(cs.variance || 0) < -1).length

        // Calculate waste cost
        const wasteCost = wasteAdj.reduce((s, a) => s + Math.abs(a.quantity) * Number(a.item?.cost || 0), 0)

        // Risk score (0-100)
        const voidRate = totalTx > 0 ? (voids / totalTx) * 100 : 0
        const refundRate = totalTx > 0 ? (refunds / totalTx) * 100 : 0
        const riskScore = Math.min(100, Math.round(
            (voidRate > 5 ? 20 : voidRate > 2 ? 10 : 0) +
            (refundRate > 5 ? 20 : refundRate > 2 ? 10 : 0) +
            (noSales > 10 ? 20 : noSales > 5 ? 10 : 0) +
            (shortShifts > 2 ? 20 : shortShifts > 0 ? 10 : 0) +
            (wasteCost > 500 ? 20 : wasteCost > 100 ? 10 : 0)
        ))

        const alerts = []
        if (voidRate > 5) alerts.push({ severity: 'CRITICAL', message: `Void rate ${voidRate.toFixed(1)}% — above 5% threshold` })
        if (refundRate > 5) alerts.push({ severity: 'CRITICAL', message: `Refund rate ${refundRate.toFixed(1)}% — above 5% threshold` })
        if (noSales > 10) alerts.push({ severity: 'WARNING', message: `${noSales} no-sale drawer opens this period` })
        if (shortShifts > 0) alerts.push({ severity: 'WARNING', message: `${shortShifts} shifts closed short (cash variance)` })
        if (wasteCost > 100) alerts.push({ severity: 'INFO', message: `$${wasteCost.toFixed(2)} in waste/damage/theft losses` })

        return ApiResponse.success({
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
                wasteLoss: Math.round(wasteCost * 100) / 100,
                totalTransactions: totalTx,
                alerts
            },
            periodDays: days
        })
    } catch (error) {
        console.error('[LOSS_PREV_GET]', error)
        return ApiResponse.error('Failed to generate loss prevention dashboard')
    }
}
