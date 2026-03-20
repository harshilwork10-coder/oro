/**
 * Sales by Hour / Day of Week Report API
 *
 * GET — Revenue and transaction count bucketed by hour and/or day-of-week
 *        Designed for staffing optimization and promotion timing
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: since }
            },
            select: { total: true, createdAt: true }
        })

        // Hourly breakdown
        const hourly: { hour: number; label: string; txCount: number; revenue: number }[] =
            Array.from({ length: 24 }, (_, h) => ({
                hour: h,
                label: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`,
                txCount: 0,
                revenue: 0
            }))

        // Day-of-week breakdown
        const byDayOfWeek: { day: number; label: string; txCount: number; revenue: number }[] =
            Array.from({ length: 7 }, (_, d) => ({
                day: d,
                label: DAY_NAMES[d],
                txCount: 0,
                revenue: 0
            }))

        for (const tx of transactions) {
            const d = new Date(tx.createdAt)
            const hour = d.getHours()
            const dow = d.getDay()
            const rev = Number(tx.total || 0)

            hourly[hour].txCount++
            hourly[hour].revenue += rev

            byDayOfWeek[dow].txCount++
            byDayOfWeek[dow].revenue += rev
        }

        // Round revenues
        hourly.forEach(h => { h.revenue = Math.round(h.revenue * 100) / 100 })
        byDayOfWeek.forEach(d => { d.revenue = Math.round(d.revenue * 100) / 100 })

        // Average per day (since we may span multiple weeks)
        const weeksInPeriod = Math.max(1, days / 7)
        const avgByDayOfWeek = byDayOfWeek.map(d => ({
            ...d,
            avgTxCount: Math.round(d.txCount / weeksInPeriod),
            avgRevenue: Math.round((d.revenue / weeksInPeriod) * 100) / 100
        }))

        // Find peaks
        const peakHour = [...hourly].sort((a, b) => b.revenue - a.revenue)[0]
        const peakDay = [...byDayOfWeek].sort((a, b) => b.revenue - a.revenue)[0]
        const slowestHour = [...hourly].filter(h => h.txCount > 0).sort((a, b) => a.revenue - b.revenue)[0]
        const slowestDay = [...byDayOfWeek].filter(d => d.txCount > 0).sort((a, b) => a.revenue - b.revenue)[0]

        return ApiResponse.success({
            hourly,
            byDayOfWeek: avgByDayOfWeek,
            insights: {
                peakHour: peakHour ? { hour: peakHour.hour, label: peakHour.label, revenue: peakHour.revenue } : null,
                peakDay: peakDay ? { day: peakDay.day, label: peakDay.label, revenue: peakDay.revenue } : null,
                slowestHour: slowestHour ? { hour: slowestHour.hour, label: slowestHour.label } : null,
                slowestDay: slowestDay ? { day: slowestDay.day, label: slowestDay.label } : null
            },
            periodDays: days,
            totalTransactions: transactions.length,
            totalRevenue: Math.round(transactions.reduce((s, t) => s + Number(t.total || 0), 0) * 100) / 100
        })
    } catch (error) {
        console.error('[SALES_HOUR_GET]', error)
        return ApiResponse.error('Failed to generate sales by hour', 500)
    }
}
