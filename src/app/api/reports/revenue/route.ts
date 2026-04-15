/**
 * Revenue Trends API
 *
 * GET — Daily revenue breakdown with trend data
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        const transactions = await prisma.transaction.findMany({
            where: { franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
            select: { total: true, tax: true, createdAt: true, paymentMethod: true }
        })

        // Daily revenue breakdown
        const dailyMap: Record<string, { revenue: number; transactions: number; tax: number }> = {}
        transactions.forEach(t => {
            const day = t.createdAt.toISOString().split('T')[0]
            if (!dailyMap[day]) dailyMap[day] = { revenue: 0, transactions: 0, tax: 0 }
            dailyMap[day].revenue += Number(t.total || 0)
            dailyMap[day].transactions++
            dailyMap[day].tax += Number(t.tax || 0)
        })

        const dailyTrend = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
                date,
                revenue: Math.round(data.revenue * 100) / 100,
                transactions: data.transactions,
                tax: Math.round(data.tax * 100) / 100,
                avgTicket: data.transactions > 0 ? Math.round((data.revenue / data.transactions) * 100) / 100 : 0
            }))

        // Payment method totals
        const paymentTotals: Record<string, number> = {}
        transactions.forEach(t => {
            const m = t.paymentMethod || 'OTHER'
            paymentTotals[m] = (paymentTotals[m] || 0) + Number(t.total || 0)
        })

        const totalRevenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
        const dailyAvg = dailyTrend.length > 0 ? totalRevenue / dailyTrend.length : 0

        return NextResponse.json({
            period: { days, since: since.toISOString() },
            summary: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalTransactions: transactions.length,
                dailyAvgRevenue: Math.round(dailyAvg * 100) / 100,
                avgTicket: transactions.length > 0 ? Math.round((totalRevenue / transactions.length) * 100) / 100 : 0
            },
            dailyTrend,
            paymentMethodBreakdown: Object.entries(paymentTotals).map(([method, total]) => ({
                method,
                total: Math.round(total * 100) / 100,
                pct: totalRevenue > 0 ? Math.round((total / totalRevenue) * 1000) / 10 : 0
            })).sort((a, b) => b.total - a.total)
        })
    } catch (error) {
        console.error('[REVENUE_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate revenue report' }, { status: 500 })
    }
}
