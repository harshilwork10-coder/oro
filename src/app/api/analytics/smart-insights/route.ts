// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * AI Analytics / Smart Insights API
 * 
 * Analyzes sales patterns and generates actionable insights:
 *   - Day-of-week trends (which days sell most)
 *   - Hour-of-day heatmap (peak times)
 *   - Product velocity (fast/slow movers)
 *   - Category trends (growing vs declining)
 *   - Revenue forecasting (simple linear projection)
 *   - Smart recommendations
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)

        // Get last 30 days transactions
        const recentTx = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: thirtyDaysAgo },
            },
            select: {
                createdAt: true,
                subtotal: true,
                total: true,
                itemLineItems: {
                    select: {
                        quantity: true,
                        priceAtSale: true,
                        item: { select: { id: true, name: true, category: true, price: true, cost: true } },
                    }
                }
            },
        })

        // Previous 30 days for comparison
        const prevTx = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
            select: { subtotal: true, total: true, createdAt: true },
        })

        // ─── Day-of-Week Analysis ───
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const byDay: Record<number, { revenue: number; count: number }> = {}
        for (let i = 0; i < 7; i++) byDay[i] = { revenue: 0, count: 0 }
        for (const tx of recentTx) {
            const day = new Date(tx.createdAt).getDay()
            byDay[day].revenue += Number(tx.total || 0)
            byDay[day].count++
        }
        const dayOfWeek = Object.entries(byDay).map(([d, v]) => ({
            day: dayNames[parseInt(d)],
            dayNum: parseInt(d),
            revenue: Math.round(v.revenue * 100) / 100,
            transactions: v.count,
            avgTicket: v.count ? Math.round((v.revenue / v.count) * 100) / 100 : 0,
        })).sort((a, b) => b.revenue - a.revenue)

        const bestDay = dayOfWeek[0]
        const worstDay = dayOfWeek[dayOfWeek.length - 1]

        // ─── Hour Heatmap ───
        const byHour: Record<number, { revenue: number; count: number }> = {}
        for (let i = 0; i < 24; i++) byHour[i] = { revenue: 0, count: 0 }
        for (const tx of recentTx) {
            const hour = new Date(tx.createdAt).getHours()
            byHour[hour].revenue += Number(tx.total || 0)
            byHour[hour].count++
        }
        const hourlyHeatmap = Object.entries(byHour).map(([h, v]) => ({
            hour: parseInt(h),
            label: `${parseInt(h) === 0 ? 12 : parseInt(h) > 12 ? parseInt(h) - 12 : parseInt(h)}${parseInt(h) >= 12 ? 'pm' : 'am'}`,
            revenue: Math.round(v.revenue * 100) / 100,
            transactions: v.count,
        }))

        const peakHour = hourlyHeatmap.reduce((best, h) => h.revenue > best.revenue ? h : best, hourlyHeatmap[0])

        // ─── Product Velocity ───
        const productSales: Record<string, { name: string; category: string; unitsSold: number; revenue: number; cost: number }> = {}
        for (const tx of recentTx) {
            for (const li of tx.itemLineItems) {
                const key = li.item?.id || 'unknown'
                if (!productSales[key]) {
                    productSales[key] = {
                        name: li.item?.name || 'Unknown',
                        category: li.item?.category || '',
                        unitsSold: 0,
                        revenue: 0,
                        cost: 0,
                    }
                }
                productSales[key].unitsSold += li.quantity
                productSales[key].revenue += li.quantity * Number(li.priceAtSale || 0)
                productSales[key].cost += li.quantity * Number(li.item?.cost || 0)
            }
        }

        const productArray = Object.values(productSales)
        const topSellers = [...productArray].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
        const slowMovers = [...productArray].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 10)

        // ─── Category Trends ───
        const categorySales: Record<string, number> = {}
        for (const p of productArray) {
            const cat = p.category || 'Uncategorized'
            categorySales[cat] = (categorySales[cat] || 0) + p.revenue
        }
        const categoryRanking = Object.entries(categorySales)
            .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // ─── Revenue Comparison ───
        const currentRevenue = recentTx.reduce((s, t) => s + Number(t.total || 0), 0)
        const prevRevenue = prevTx.reduce((s, t) => s + Number(t.total || 0), 0)
        const revenueChange = prevRevenue > 0
            ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 10000) / 100
            : 0

        // ─── Smart Insights ───
        const insights: { emoji: string; title: string; detail: string; type: string }[] = []

        // Best day insight
        if (bestDay && worstDay) {
            const ratio = worstDay.revenue > 0 ? (bestDay.revenue / worstDay.revenue) : 0
            if (ratio > 1.5) {
                insights.push({
                    emoji: '📈',
                    title: `${bestDay.day} is your best day`,
                    detail: `${bestDay.day} brings in ${Math.round(ratio * 10) / 10}x more revenue than ${worstDay.day}. Consider running ${worstDay.day}-only promotions to boost slow days.`,
                    type: 'opportunity',
                })
            }
        }

        // Peak hour insight
        if (peakHour) {
            insights.push({
                emoji: '⏰',
                title: `Peak hour: ${peakHour.label}`,
                detail: `Most sales happen at ${peakHour.label} ($${peakHour.revenue.toFixed(0)} revenue). Make sure you're fully staffed during this window.`,
                type: 'staffing',
            })
        }

        // Revenue trend
        if (revenueChange > 5) {
            insights.push({
                emoji: '🚀',
                title: `Revenue up ${revenueChange}% vs last month`,
                detail: `You're on a growth trajectory! Current 30-day: $${currentRevenue.toFixed(0)} vs previous: $${prevRevenue.toFixed(0)}.`,
                type: 'growth',
            })
        } else if (revenueChange < -5) {
            insights.push({
                emoji: '⚠️',
                title: `Revenue down ${Math.abs(revenueChange)}% vs last month`,
                detail: `Current 30-day: $${currentRevenue.toFixed(0)} vs previous $${prevRevenue.toFixed(0)}. Consider new promotions or marketing push.`,
                type: 'alert',
            })
        }

        // Top seller insight
        if (topSellers.length > 0) {
            const top = topSellers[0]
            insights.push({
                emoji: '🏆',
                title: `#1 seller: ${top.name}`,
                detail: `${top.name} has sold ${top.unitsSold} units ($${top.revenue.toFixed(0)} revenue) in the last 30 days. Keep it stocked!`,
                type: 'inventory',
            })
        }

        // Margin insight
        const totalCost = productArray.reduce((s, p) => s + p.cost, 0)
        const avgMargin = currentRevenue > 0 ? Math.round(((currentRevenue - totalCost) / currentRevenue) * 10000) / 100 : 0
        if (avgMargin > 0) {
            insights.push({
                emoji: '💰',
                title: `Overall margin: ${avgMargin}%`,
                detail: avgMargin > 30
                    ? 'Healthy margins! Your pricing strategy is working well.'
                    : 'Margins are tight. Consider reviewing pricing on low-margin categories.',
                type: avgMargin > 30 ? 'positive' : 'alert',
            })
        }

        // Slow mover insight
        if (slowMovers.length > 0 && slowMovers[0].unitsSold < 3) {
            const deadStock = slowMovers.filter(p => p.unitsSold <= 1).length
            if (deadStock > 0) {
                insights.push({
                    emoji: '📦',
                    title: `${deadStock} slow-moving products`,
                    detail: `${deadStock} products sold 1 or fewer units in 30 days. Consider clearance pricing or removing from shelves.`,
                    type: 'inventory',
                })
            }
        }

        // Daily avg
        const avgDaily = currentRevenue / 30
        const projectedMonthly = avgDaily * 30
        insights.push({
            emoji: '📊',
            title: `Daily average: $${avgDaily.toFixed(0)}`,
            detail: `You're averaging $${avgDaily.toFixed(0)}/day. Projected monthly: $${projectedMonthly.toFixed(0)}. ${recentTx.length} total transactions.`,
            type: 'info',
        })

        return NextResponse.json({
            period: { start: thirtyDaysAgo.toISOString(), end: now.toISOString() },
            overview: {
                currentRevenue: Math.round(currentRevenue * 100) / 100,
                prevRevenue: Math.round(prevRevenue * 100) / 100,
                revenueChange,
                totalTransactions: recentTx.length,
                avgTicket: recentTx.length ? Math.round((currentRevenue / recentTx.length) * 100) / 100 : 0,
                avgMargin,
            },
            dayOfWeek,
            hourlyHeatmap,
            topSellers,
            slowMovers,
            categoryRanking,
            insights,
        })

    } catch (error) {
        console.error('AI Analytics error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
