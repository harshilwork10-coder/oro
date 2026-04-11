/**
 * Price Changes Audit Log API
 *
 * GET — Track all price modifications with before/after values
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

        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to generate price changes report' }, { status: 500 })
    }
}
