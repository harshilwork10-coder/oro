'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Get price change history (filterable)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const itemId = searchParams.get('itemId')
        const days = parseInt(searchParams.get('days') || '30')
        const source = searchParams.get('source') // MANUAL, AUTO_REPRICE, IMPORT, etc.
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

        const since = new Date()
        since.setDate(since.getDate() - days)

        const where: any = {
            createdAt: { gte: since },
            item: { franchiseId: user.franchiseId }
        }
        if (itemId) where.itemId = itemId
        if (source) where.source = source

        const [logs, total] = await Promise.all([
            (prisma as any).priceChangeLog.findMany({
                where,
                include: {
                    item: { select: { id: true, name: true, barcode: true, sku: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            (prisma as any).priceChangeLog.count({ where })
        ])

        return ApiResponse.success({
            logs,
            total,
            page,
            pages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.error('[PRICE_CHANGES_GET]', error)
        return ApiResponse.error('Failed to fetch price changes')
    }
}
