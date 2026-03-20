/**
 * Hourly Sales Heatmap API
 *
 * GET — Revenue and transaction count bucketed by hour-of-day and day-of-week
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

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
        const days = parseInt(searchParams.get('days') || '7')

        const since = new Date()
        since.setDate(since.getDate() - days)

        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: since }
            },
            select: { total: true, createdAt: true }
        })

        // Build hourly breakdown (0-23) for each day of week (0=Sun, 6=Sat)
        const heatmap: Record<string, { count: number; revenue: number }> = {}
        const hourlyTotals: { hour: number; count: number; revenue: number }[] =
            Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, revenue: 0 }))

        for (const tx of transactions) {
            const d = new Date(tx.createdAt)
            const hour = d.getHours()
            const dow = d.getDay()
            const key = `${dow}-${hour}`

            if (!heatmap[key]) heatmap[key] = { count: 0, revenue: 0 }
            heatmap[key].count++
            heatmap[key].revenue += Number(tx.total || 0)

            hourlyTotals[hour].count++
            hourlyTotals[hour].revenue += Number(tx.total || 0)
        }

        // Calculate peak hours
        const sorted = [...hourlyTotals].sort((a, b) => b.revenue - a.revenue)
        const peak = sorted.slice(0, 3).map(h => ({
            hour: h.hour,
            label: `${h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour}${h.hour >= 12 ? 'pm' : 'am'}`,
            avgTransactions: Math.round(h.count / days),
            avgRevenue: Math.round((h.revenue / days) * 100) / 100
        }))

        // Round revenues
        hourlyTotals.forEach(h => { h.revenue = Math.round(h.revenue * 100) / 100 })

        return ApiResponse.success({ heatmap, hourlyTotals, peakHours: peak, periodDays: days })
    } catch (error) {
        console.error('[HEATMAP_GET]', error)
        return ApiResponse.error('Failed to generate heatmap', 500)
    }
}
