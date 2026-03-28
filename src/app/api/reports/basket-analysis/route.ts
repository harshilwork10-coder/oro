/**
 * Basket Analysis API
 *
 * GET — Identify frequently co-purchased items, average basket size, and metrics
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
        const days = parseInt(searchParams.get('days') || '30')
        const minSupport = parseInt(searchParams.get('minSupport') || '3') // min co-occurrences
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get transactions with their product line items
        const transactions = await prisma.transaction.findMany({
            where: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
            select: {
                id: true,
                total: true,
                lineItems: {
                    where: { type: 'PRODUCT', productId: { not: null } },
                    select: { productId: true, quantity: true }
                }
            }
        })

        // Only multi-item baskets
        const multiItem = transactions.filter(t => t.lineItems.length >= 2)

        // Count co-occurrences
        const pairCounts: Record<string, number> = {}
        const itemCounts: Record<string, number> = {}

        for (const tx of multiItem) {
            const productIds = [...new Set(tx.lineItems.map(li => li.productId!).filter(Boolean))]
            for (const pid of productIds) {
                itemCounts[pid] = (itemCounts[pid] || 0) + 1
            }
            for (let i = 0; i < productIds.length; i++) {
                for (let j = i + 1; j < productIds.length; j++) {
                    const key = [productIds[i], productIds[j]].sort().join('|')
                    pairCounts[key] = (pairCounts[key] || 0) + 1
                }
            }
        }

        // Get product names for top pairs
        const allIds = new Set<string>()
        Object.keys(pairCounts).forEach(key => {
            const [a, b] = key.split('|')
            allIds.add(a); allIds.add(b)
        })

        const products = await prisma.product.findMany({
            where: { id: { in: Array.from(allIds) } },
            select: { id: true, name: true, barcode: true }
        })
        const nameMap = new Map(products.map(p => [p.id, p.name]))

        // Build pair results, filtered by support
        const pairs = Object.entries(pairCounts)
            .filter(([, count]) => count >= minSupport)
            .map(([key, count]) => {
                const [a, b] = key.split('|')
                const confidence = (itemCounts[a] || 1) > 0 ? (count / (itemCounts[a] || 1)) : 0
                return {
                    itemA: nameMap.get(a) || a,
                    itemB: nameMap.get(b) || b,
                    coOccurrences: count,
                    confidence: Math.round(confidence * 1000) / 10
                }
            })
            .sort((a, b) => b.coOccurrences - a.coOccurrences)
            .slice(0, 20)

        // Basket size stats
        const basketSizes = transactions.map(t => t.lineItems.length)
        const avgBasketSize = basketSizes.length > 0
            ? Math.round((basketSizes.reduce((s, b) => s + b, 0) / basketSizes.length) * 10) / 10
            : 0

        const avgBasketValue = transactions.length > 0
            ? Math.round((transactions.reduce((s, t) => s + Number(t.total || 0), 0) / transactions.length) * 100) / 100
            : 0

        return NextResponse.json({
            pairs,
            metrics: {
                totalTransactions: transactions.length,
                multiItemTransactions: multiItem.length,
                multiItemPct: transactions.length > 0
                    ? Math.round((multiItem.length / transactions.length) * 1000) / 10
                    : 0,
                avgBasketSize,
                avgBasketValue
            },
            periodDays: days
        })
    } catch (error) {
        console.error('[BASKET_GET]', error)
        return NextResponse.json({ error: 'Failed to generate basket analysis' }, { status: 500 })
    }
}
