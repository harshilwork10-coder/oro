// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Category Shift Tracker
 * 
 * Shows which product categories are growing vs declining.
 * Compares current period vs previous period.
 * Helps owners reallocate shelf space from declining (alcohol)
 * to growing categories (energy drinks, snacks, fresh food).
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')

        const now = new Date()
        const currentStart = new Date(now.getTime() - days * 86400000)
        const prevStart = new Date(now.getTime() - days * 2 * 86400000)

        // Current period line items
        const currentTx = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: currentStart },
            },
            select: {
                total: true,
                itemLineItems: {
                    select: {
                        quantity: true,
                        priceAtSale: true,
                        item: { select: { category: true, name: true } },
                    }
                }
            },
        })

        // Previous period
        const prevTx = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: prevStart, lt: currentStart },
            },
            select: {
                total: true,
                itemLineItems: {
                    select: {
                        quantity: true,
                        priceAtSale: true,
                        item: { select: { category: true } },
                    }
                }
            },
        })

        // Aggregate by category
        const aggregate = (txList: typeof currentTx) => {
            const cats: Record<string, { revenue: number; units: number; transactions: number }> = {}
            for (const tx of txList) {
                const seenCats = new Set<string>()
                for (const li of tx.itemLineItems) {
                    const cat = li.item?.category || 'Uncategorized'
                    if (!cats[cat]) cats[cat] = { revenue: 0, units: 0, transactions: 0 }
                    cats[cat].revenue += li.quantity * Number(li.priceAtSale || 0)
                    cats[cat].units += li.quantity
                    seenCats.add(cat)
                }
                for (const cat of seenCats) {
                    cats[cat].transactions++
                }
            }
            return cats
        }

        const currentCats = aggregate(currentTx)
        const prevCats = aggregate(prevTx)

        // Build shift data
        const allCategories = [...new Set([...Object.keys(currentCats), ...Object.keys(prevCats)])]
        const totalCurrentRev = Object.values(currentCats).reduce((s, c) => s + c.revenue, 0)
        const totalPrevRev = Object.values(prevCats).reduce((s, c) => s + c.revenue, 0)

        const categoryShifts = allCategories.map(cat => {
            const cur = currentCats[cat] || { revenue: 0, units: 0, transactions: 0 }
            const prev = prevCats[cat] || { revenue: 0, units: 0, transactions: 0 }
            const revChange = prev.revenue > 0
                ? Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 10000) / 100
                : cur.revenue > 0 ? 100 : 0
            const unitChange = prev.units > 0
                ? Math.round(((cur.units - prev.units) / prev.units) * 10000) / 100
                : cur.units > 0 ? 100 : 0

            const shareOfWallet = totalCurrentRev > 0
                ? Math.round((cur.revenue / totalCurrentRev) * 10000) / 100
                : 0
            const prevShare = totalPrevRev > 0
                ? Math.round((prev.revenue / totalPrevRev) * 10000) / 100
                : 0

            let trend: 'GROWING' | 'DECLINING' | 'STABLE' | 'NEW' | 'GONE' = 'STABLE'
            if (prev.revenue === 0 && cur.revenue > 0) trend = 'NEW'
            else if (cur.revenue === 0 && prev.revenue > 0) trend = 'GONE'
            else if (revChange > 10) trend = 'GROWING'
            else if (revChange < -10) trend = 'DECLINING'

            return {
                category: cat,
                currentRevenue: Math.round(cur.revenue * 100) / 100,
                prevRevenue: Math.round(prev.revenue * 100) / 100,
                revenueChange: revChange,
                currentUnits: cur.units,
                prevUnits: prev.units,
                unitChange,
                shareOfWallet,
                prevShare,
                shareChange: Math.round((shareOfWallet - prevShare) * 100) / 100,
                trend,
                transactions: cur.transactions,
            }
        }).sort((a, b) => b.currentRevenue - a.currentRevenue)

        const growing = categoryShifts.filter(c => c.trend === 'GROWING')
        const declining = categoryShifts.filter(c => c.trend === 'DECLINING')

        // Actionable insights
        const actions: { emoji: string; action: string; detail: string }[] = []

        for (const g of growing.slice(0, 3)) {
            actions.push({
                emoji: '📈',
                action: `Expand ${g.category} section`,
                detail: `Up ${g.revenueChange}% (+$${(g.currentRevenue - g.prevRevenue).toFixed(0)}). Allocate more shelf space.`,
            })
        }

        for (const d of declining.slice(0, 3)) {
            actions.push({
                emoji: '📉',
                action: `Review ${d.category} shelf space`,
                detail: `Down ${Math.abs(d.revenueChange)}% (-$${(d.prevRevenue - d.currentRevenue).toFixed(0)}). Consider reducing inventory or running promotions.`,
            })
        }

        if (growing.length > 0 && declining.length > 0) {
            actions.push({
                emoji: '🔄',
                action: `Reallocate: ${declining[0]?.category} → ${growing[0]?.category}`,
                detail: `Move shelf space from declining ${declining[0]?.category} to fast-growing ${growing[0]?.category} for max revenue.`,
            })
        }

        return NextResponse.json({
            period: { days, currentStart, prevStart },
            totalRevenue: {
                current: Math.round(totalCurrentRev * 100) / 100,
                previous: Math.round(totalPrevRev * 100) / 100,
                change: totalPrevRev > 0 ? Math.round(((totalCurrentRev - totalPrevRev) / totalPrevRev) * 10000) / 100 : 0,
            },
            categories: categoryShifts,
            summary: {
                growing: growing.length,
                declining: declining.length,
                stable: categoryShifts.filter(c => c.trend === 'STABLE').length,
                topGrowing: growing[0]?.category || 'None',
                topDeclining: declining[0]?.category || 'None',
            },
            actions,
        })

    } catch (error) {
        console.error('Category Shift error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
