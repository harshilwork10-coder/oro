/**
 * Realtime Sales Ticker API
 *
 * GET — Live KPI snapshot: today's revenue, last hour, vs yesterday, projected total
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const franchiseId = user.franchiseId
        const baseWhere = { franchiseId, status: 'COMPLETED' as const }

        // Today's start
        const today = new Date(); today.setHours(0, 0, 0, 0)

        const [todayTx, lastHourTx, yesterdayTx] = await Promise.all([
            prisma.transaction.findMany({
                where: { ...baseWhere, createdAt: { gte: today } },
                select: { total: true, createdAt: true }
            }),
            prisma.transaction.findMany({
                where: { ...baseWhere, createdAt: { gte: new Date(Date.now() - 3600000) } },
                select: { total: true }
            }),
            prisma.transaction.findMany({
                where: {
                    ...baseWhere,
                    createdAt: { gte: new Date(today.getTime() - 86400000), lt: today }
                },
                select: { total: true }
            })
        ])

        const todayRevenue = todayTx.reduce((s, t) => s + Number(t.total || 0), 0)
        const lastHourRevenue = lastHourTx.reduce((s, t) => s + Number(t.total || 0), 0)
        const yesterdayRevenue = yesterdayTx.reduce((s, t) => s + Number(t.total || 0), 0)

        // Hour of day progress (what % of business day is done)
        const now = new Date()
        const hourOfDay = now.getHours()
        const businessHoursElapsed = Math.max(0, hourOfDay - 6) // Assume opens at 6am
        const businessHoursTotal = 16 // 6am to 10pm
        const dayProgress = Math.min(100, Math.round((businessHoursElapsed / businessHoursTotal) * 100))

        // Projected daily total
        const projectedRevenue = dayProgress > 10
            ? Math.round((todayRevenue / (dayProgress / 100)) * 100) / 100
            : null

        // Last transaction
        const lastTx = todayTx.length > 0
            ? todayTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            : null

        return NextResponse.json({
            live: {
                todayRevenue: Math.round(todayRevenue * 100) / 100,
                todayTransactions: todayTx.length,
                avgTicket: todayTx.length > 0 ? Math.round((todayRevenue / todayTx.length) * 100) / 100 : 0,
                lastHourRevenue: Math.round(lastHourRevenue * 100) / 100,
                lastHourTransactions: lastHourTx.length,
                yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
                vsYesterday: yesterdayRevenue > 0
                    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
                    : null,
                projectedRevenue,
                dayProgress,
                lastTransaction: lastTx ? {
                    total: Number(lastTx.total),
                    time: lastTx.createdAt
                } : null,
                updatedAt: new Date()
            }
        })
    } catch (error) {
        console.error('[REALTIME_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch realtime data' }, { status: 500 })
    }
}
