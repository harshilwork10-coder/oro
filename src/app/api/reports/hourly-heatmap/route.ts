/**
 * Hourly Sales Heatmap API
 *
 * GET — Revenue and transaction count bucketed by hour-of-day and day-of-week
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
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

        return NextResponse.json({ heatmap, hourlyTotals, peakHours: peak, periodDays: days })
    } catch (error) {
        console.error('[HEATMAP_GET]', error)
        return NextResponse.json({ error: 'Failed to generate heatmap' }, { status: 500 })
    }
}
