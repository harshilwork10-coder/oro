/**
 * Price Changes Audit Log API
 *
 * GET — Track all price modifications with before/after values
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
        const days = parseInt(searchParams.get('days') || '30')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
        const since = new Date(); since.setDate(since.getDate() - days)

        const where = {
            item: { franchiseId: user.franchiseId },
            createdAt: { gte: since }
        }

        const [logs, total] = await Promise.all([
            prisma.priceChangeLog.findMany({
                where,
                include: {
                    item: { select: { id: true, name: true, barcode: true, sku: true, price: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.priceChangeLog.count({ where })
        ])

        const items = logs.map(log => ({
            id: log.id,
            date: log.createdAt,
            itemId: log.item.id,
            itemName: log.item.name,
            barcode: log.item.barcode,
            oldPrice: Number(log.oldPrice),
            newPrice: Number(log.newPrice),
            changeAmount: Math.round((Number(log.newPrice) - Number(log.oldPrice)) * 100) / 100,
            changePct: Number(log.oldPrice) > 0
                ? Math.round(((Number(log.newPrice) - Number(log.oldPrice)) / Number(log.oldPrice)) * 1000) / 10
                : 0,
            source: log.source,
            changedBy: log.changedBy
        }))

        // Summary
        const increases = items.filter(i => i.changeAmount > 0)
        const decreases = items.filter(i => i.changeAmount < 0)

        return ApiResponse.success({
            changes: items,
            summary: {
                totalChanges: total,
                priceIncreases: increases.length,
                priceDecreases: decreases.length,
                avgIncrease: increases.length > 0
                    ? Math.round((increases.reduce((s, i) => s + i.changePct, 0) / increases.length) * 10) / 10
                    : 0,
                avgDecrease: decreases.length > 0
                    ? Math.round((decreases.reduce((s, i) => s + i.changePct, 0) / decreases.length) * 10) / 10
                    : 0
            },
            pagination: { page, pages: Math.ceil(total / limit), total },
            periodDays: days
        })
    } catch (error) {
        console.error('[PRICE_CHANGES_GET]', error)
        return ApiResponse.error('Failed to generate price changes report', 500)
    }
}
