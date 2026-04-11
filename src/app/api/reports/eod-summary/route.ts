/**
 * End-of-Day Summary API
 *
 * GET — Generate daily summary (single API call replaces multiple report fetches)
 * Returns: revenue, transactions, top items, payment breakdown, labor, variances
 *
 * This is a "mega query" — one call gives the owner everything they need.
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
        const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const dayStart = new Date(dateStr + 'T00:00:00')
        const dayEnd = new Date(dateStr + 'T23:59:59.999')

        const franchiseId = user.franchiseId

        // === ONE BIG QUERY — replaces 6 separate API calls ===
        const [transactions, cashSessions] = await Promise.all([
            // All transactions for the day
            prisma.transaction.findMany({
                where: { franchiseId, createdAt: { gte: dayStart, lte: dayEnd } },
                include: {
                    lineItems: {
                        select: {
                            quantity: true,
                            total: true,
                            type: true,
                            productNameSnapshot: true,
                            serviceNameSnapshot: true,
                            productId: true,
                            serviceId: true,
                            price: true
                        }
                    },
                    taxLines: true
                }
            }),
            // Cash drawer sessions
            prisma.cashDrawerSession.findMany({
                where: {
                    location: { franchiseId },
                    startTime: { gte: dayStart, lte: dayEnd }
                },
                select: { variance: true, status: true, startingCash: true, endingCash: true }
            })
        ])

        // Revenue
        const completedTxns = transactions.filter(t => t.status === 'COMPLETED')
        const totalRevenue = completedTxns.reduce((s, t) => s + Number(t.total || 0), 0)
        const totalTax = completedTxns.reduce((s, t) => s + Number(t.tax || 0), 0)
        const avgTicket = completedTxns.length > 0 ? totalRevenue / completedTxns.length : 0

        // Refunds / Voids
        const refunds = transactions.filter(t => t.status === 'REFUNDED')
        const voids = transactions.filter(t => t.status === 'VOIDED')
        const refundTotal = refunds.reduce((s, t) => s + Math.abs(Number(t.total || 0)), 0)

        // Payment breakdown
        const paymentBreakdown: Record<string, number> = {}
        completedTxns.forEach(t => {
            const method = t.paymentMethod || 'UNKNOWN'
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(t.total || 0)
        })

        // Top items by revenue
        const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
        completedTxns.forEach(t => {
            (t.lineItems || []).forEach((li) => {
                const name = li.productNameSnapshot || li.serviceNameSnapshot || li.productId || 'Unknown'
                const key = li.productId || li.serviceId || name
                const existing = itemMap.get(key)
                const lineRevenue = Number(li.total || 0)
                if (existing) {
                    existing.quantity += (li.quantity || 1)
                    existing.revenue += lineRevenue
                } else {
                    itemMap.set(key, {
                        name,
                        quantity: li.quantity || 1,
                        revenue: lineRevenue
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

        // Cash variance
        const closedSessions = cashSessions.filter(s => s.status === 'CLOSED')
        const totalVariance = closedSessions.reduce((s, cs) => s + Math.abs(Number(cs.variance || 0)), 0)

        return NextResponse.json({
            date: dateStr,
            revenue: {
                total: Math.round(totalRevenue * 100) / 100,
                tax: Math.round(totalTax * 100) / 100,
                net: Math.round((totalRevenue - totalTax) * 100) / 100,
                transactions: completedTxns.length,
                avgTicket: Math.round(avgTicket * 100) / 100
            },
            refunds: { count: refunds.length, total: Math.round(refundTotal * 100) / 100 },
            voids: { count: voids.length },
            paymentBreakdown,
            topItems,
            hourlyRevenue,
            cash: {
                drawerSessions: cashSessions.length,
                totalVariance: Math.round(totalVariance * 100) / 100
            }
        })
    } catch (error) {
        console.error('[EOD_SUMMARY]', error)
        return NextResponse.json({ error: 'Failed to generate end-of-day summary' }, { status: 500 })
    }
}
