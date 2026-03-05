// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Market Basket Analysis API
 * 
 * Analyzes transaction history to find:
 *   - Frequently bought together pairs
 *   - Cross-category affinities  
 *   - Optimal product placement suggestions
 *   - Basket composition insights
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Get 30 days of multi-item transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
            },
            select: {
                id: true,
                itemLineItems: {
                    select: {
                        productId: true,
                        quantity: true,
                        item: { select: { name: true, category: true, price: true } },
                    }
                }
            },
        })

        // Only analyze multi-item baskets
        const multiItemTx = transactions.filter(tx => tx.itemLineItems.length >= 2)

        // ─── Pair Co-occurrence ───
        const pairCount: Record<string, { count: number; nameA: string; nameB: string; catA: string; catB: string }> = {}
        const productFreq: Record<string, { count: number; name: string; category: string; price: number }> = {}

        for (const tx of multiItemTx) {
            const items = tx.itemLineItems
            // Track individual product frequency
            for (const item of items) {
                if (!productFreq[item.productId]) {
                    productFreq[item.productId] = {
                        count: 0,
                        name: item.item?.name || '',
                        category: item.item?.category || '',
                        price: Number(item.item?.price || 0),
                    }
                }
                productFreq[item.productId].count++
            }

            // Count all pairs
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const ids = [items[i].productId, items[j].productId].sort()
                    const key = ids.join('|')
                    if (!pairCount[key]) {
                        pairCount[key] = {
                            count: 0,
                            nameA: items[i].item?.name || '',
                            nameB: items[j].item?.name || '',
                            catA: items[i].item?.category || '',
                            catB: items[j].item?.category || '',
                        }
                    }
                    pairCount[key].count++
                }
            }
        }

        // Top pairs
        const topPairs = Object.entries(pairCount)
            .map(([key, data]) => ({
                productA: data.nameA,
                productB: data.nameB,
                categoryA: data.catA,
                categoryB: data.catB,
                frequency: data.count,
                confidence: Math.round((data.count / multiItemTx.length) * 10000) / 100,
                crossCategory: data.catA !== data.catB,
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 20)

        // ─── Category Affinity Matrix ───
        const catPairCount: Record<string, number> = {}
        const catFreq: Record<string, number> = {}

        for (const tx of multiItemTx) {
            const cats = [...new Set(tx.itemLineItems.map(i => i.item?.category || 'Other'))]
            for (const cat of cats) catFreq[cat] = (catFreq[cat] || 0) + 1
            for (let i = 0; i < cats.length; i++) {
                for (let j = i + 1; j < cats.length; j++) {
                    const key = [cats[i], cats[j]].sort().join('|')
                    catPairCount[key] = (catPairCount[key] || 0) + 1
                }
            }
        }

        const categoryAffinities = Object.entries(catPairCount)
            .map(([key, count]) => {
                const [catA, catB] = key.split('|')
                const lift = (count / multiItemTx.length) / ((catFreq[catA] || 1) / multiItemTx.length * (catFreq[catB] || 1) / multiItemTx.length)
                return {
                    categoryA: catA,
                    categoryB: catB,
                    frequency: count,
                    lift: Math.round(lift * 100) / 100,
                    percentage: Math.round((count / multiItemTx.length) * 10000) / 100,
                }
            })
            .sort((a, b) => b.lift - a.lift)
            .slice(0, 15)

        // ─── Basket Stats ───
        const basketSizes = transactions.map(tx => tx.itemLineItems.length)
        const avgBasket = basketSizes.length ? basketSizes.reduce((s, v) => s + v, 0) / basketSizes.length : 0
        const multiItemPct = transactions.length ? (multiItemTx.length / transactions.length) * 100 : 0

        // ─── Placement Suggestions ───
        const placementSuggestions: { suggestion: string; reason: string; impact: string }[] = []

        // Find strongest cross-category pairs
        const crossCatPairs = topPairs.filter(p => p.crossCategory).slice(0, 3)
        for (const pair of crossCatPairs) {
            placementSuggestions.push({
                suggestion: `Place ${pair.categoryA} near ${pair.categoryB}`,
                reason: `${pair.productA} + ${pair.productB} bought together ${pair.frequency} times`,
                impact: `${pair.confidence}% of multi-item baskets`,
            })
        }

        // Find high-lift category combos
        for (const aff of categoryAffinities.slice(0, 2)) {
            if (aff.lift > 2) {
                placementSuggestions.push({
                    suggestion: `Cross-promote ${aff.categoryA} × ${aff.categoryB}`,
                    reason: `${aff.lift}x more likely to be bought together than chance`,
                    impact: `Appears in ${aff.percentage}% of baskets`,
                })
            }
        }

        return NextResponse.json({
            period: '30 days',
            basketStats: {
                totalTransactions: transactions.length,
                multiItemTransactions: multiItemTx.length,
                multiItemPercent: Math.round(multiItemPct * 10) / 10,
                avgBasketSize: Math.round(avgBasket * 10) / 10,
            },
            topPairs,
            categoryAffinities,
            placementSuggestions,
        })

    } catch (error) {
        console.error('Market Basket Analysis error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
