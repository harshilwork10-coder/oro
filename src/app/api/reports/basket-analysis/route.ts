'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Basket analysis: "frequently bought together"
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const minSupport = parseInt(searchParams.get('minSupport') || '3') // Min co-occurrences

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get all transactions with their items
        const transactions = await prisma.transaction.findMany({
            where: { locationId, status: 'COMPLETED', createdAt: { gte: since } },
            select: {
                id: true,
                items: { select: { itemId: true, name: true } }
            }
        })

        // Count co-occurrences (item pairs appearing in same basket)
        const pairs: Record<string, { items: [string, string]; names: [string, string]; count: number }> = {}

        for (const tx of transactions) {
            const items = tx.items.filter(i => i.itemId)
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const ids = [items[i].itemId!, items[j].itemId!].sort()
                    const key = ids.join('|')
                    if (!pairs[key]) {
                        pairs[key] = {
                            items: ids as [string, string],
                            names: [items[i].name, items[j].name] as [string, string],
                            count: 0
                        }
                    }
                    pairs[key].count++
                }
            }
        }

        // Filter and sort by frequency
        const results = Object.values(pairs)
            .filter(p => p.count >= minSupport)
            .sort((a, b) => b.count - a.count)
            .slice(0, 50)
            .map(p => ({
                pair: p.names,
                itemIds: p.items,
                coOccurrences: p.count,
                confidence: Math.round((p.count / transactions.length) * 10000) / 100
            }))

        // Avg basket size
        const avgBasketSize = transactions.length > 0
            ? Math.round((transactions.reduce((s, t) => s + t.items.length, 0) / transactions.length) * 10) / 10
            : 0

        return ApiResponse.success({
            pairs: results,
            totalTransactions: transactions.length,
            avgBasketSize,
            periodDays: days
        })
    } catch (error) {
        console.error('[BASKET_ANALYSIS_GET]', error)
        return ApiResponse.error('Failed to generate basket analysis')
    }
}
