// @ts-nocheck
/**
 * End-of-Day Summary API
 *
 * GET — Generate daily summary (single API call replaces multiple report fetches)
 * Returns: revenue, transactions, top items, payment breakdown, labor, variances
 *
 * This is a "mega query" — one call gives the owner everything they need.
 * Designed to replace 5-6 separate API calls the dashboard would otherwise make.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, locationId: true },
    })

    if (!user?.locationId) return NextResponse.json({ error: 'No location' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    // === ONE BIG QUERY — replaces 6 separate API calls ===
    const [transactions, timeEntries, cashSessions, cashDrops] = await Promise.all([
        // All transactions for the day
        prisma.transaction.findMany({
            where: { locationId: user.locationId, createdAt: { gte: dayStart, lte: dayEnd } },
            include: { lineItems: true, taxLines: true },
        }),
        // Labor for the day
        prisma.timeEntry.findMany({
            where: { locationId: user.locationId, clockIn: { gte: dayStart, lte: dayEnd } },
            include: { user: { select: { firstName: true, lastName: true } } },
        }),
        // Cash drawer sessions
        prisma.cashDrawerSession.findMany({
            where: { locationId: user.locationId, openedAt: { gte: dayStart, lte: dayEnd } },
        }),
        // Cash drops / safe drops
        prisma.cashDrop.findMany({
            where: { locationId: user.locationId, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
    ])

    // Revenue
    const completedTxns = transactions.filter(t => t.status === 'COMPLETED')
    const totalRevenue = completedTxns.reduce((s, t) => s + Number(t.total || 0), 0)
    const totalTax = completedTxns.reduce((s, t) => s + Number(t.taxAmount || 0), 0)
    const avgTicket = completedTxns.length > 0 ? totalRevenue / completedTxns.length : 0

    // Refunds / Voids
    const refunds = transactions.filter(t => t.status === 'REFUNDED')
    const voids = transactions.filter(t => t.status === 'VOIDED')
    const refundTotal = refunds.reduce((s, t) => s + Number(t.total || 0), 0)

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {}
    completedTxns.forEach(t => {
        const method = (t as any).paymentMethod || 'UNKNOWN'
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(t.total || 0)
    })

    // Top items by revenue
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    completedTxns.forEach(t => {
        (t.lineItems || []).forEach((li: any) => {
            const existing = itemMap.get(li.name || li.itemId)
            if (existing) {
                existing.quantity += li.quantity
                existing.revenue += Number(li.total || li.price * li.quantity || 0)
            } else {
                itemMap.set(li.name || li.itemId, {
                    name: li.name || li.itemId,
                    quantity: li.quantity,
                    revenue: Number(li.total || li.price * li.quantity || 0),
                })
            }
        })
    })
    const topItems = Array.from(itemMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    // Hourly breakdown (for mini chart)
    const hourlyRevenue: number[] = Array(24).fill(0)
    completedTxns.forEach(t => {
        const hour = new Date(t.createdAt).getHours()
        hourlyRevenue[hour] += Number(t.total || 0)
    })

    // Labor
    const totalLaborHours = timeEntries.reduce((s, te) => {
        if (!te.clockOut) return s
        return s + (new Date(te.clockOut).getTime() - new Date(te.clockIn).getTime()) / 3600000
    }, 0)

    // Cash variance
    const totalCashDrops = cashDrops.reduce((s, d) => s + Number(d.amount || 0), 0)

    return NextResponse.json({
        data: {
            date: dateStr,
            revenue: {
                total: Math.round(totalRevenue * 100) / 100,
                tax: Math.round(totalTax * 100) / 100,
                net: Math.round((totalRevenue - totalTax) * 100) / 100,
                transactions: completedTxns.length,
                avgTicket: Math.round(avgTicket * 100) / 100,
            },
            refunds: { count: refunds.length, total: Math.round(refundTotal * 100) / 100 },
            voids: { count: voids.length },
            paymentBreakdown,
            topItems,
            hourlyRevenue,
            labor: {
                employees: timeEntries.length,
                totalHours: Math.round(totalLaborHours * 10) / 10,
                laborCostEstimate: Math.round(totalLaborHours * 15 * 100) / 100, // $15/hr avg
            },
            cash: {
                drawerSessions: cashSessions.length,
                totalDrops: Math.round(totalCashDrops * 100) / 100,
            },
        },
    })
}
