// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Sales velocity: items ranked by sell-through speed
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const categoryId = searchParams.get('categoryId')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get all sales grouped by item
        const where: any = {
            transaction: { locationId, status: 'COMPLETED', createdAt: { gte: since } }
        }

        const salesData = await prisma.transactionLineItem.groupBy({
            by: ['itemId'],
            where,
            _sum: { quantity: true, total: true },
            _count: { id: true }
        })

        const itemIds = salesData.map(s => s.itemId).filter(Boolean) as string[]
        const itemWhere: any = { id: { in: itemIds } }
        if (categoryId) itemWhere.categoryId = categoryId

        const items = await prisma.item.findMany({
            where: itemWhere,
            select: {
                id: true, name: true, barcode: true, stock: true, cost: true, price: true,
                category: { select: { name: true } }
            }
        })

        const itemMap = new Map(items.map(i => [i.id, i]))

        const velocity = salesData
            .filter(s => s.itemId && itemMap.has(s.itemId!))
            .map(s => {
                const item = itemMap.get(s.itemId!)!
                const unitsSold = s._sum.quantity || 0
                const unitsPerDay = unitsSold / days
                const currentStock = item.stock || 0
                const daysOfStock = unitsPerDay > 0 ? Math.round(currentStock / unitsPerDay) : 999

                return {
                    itemId: item.id,
                    name: item.name,
                    barcode: item.barcode,
                    category: item.category?.name || 'Uncategorized',
                    unitsSold,
                    revenue: Math.round(Number(s._sum.total || 0) * 100) / 100,
                    unitsPerDay: Math.round(unitsPerDay * 10) / 10,
                    currentStock,
                    daysOfStock,
                    status: daysOfStock <= 3 ? 'CRITICAL' : daysOfStock <= 7 ? 'LOW' : daysOfStock <= 14 ? 'WATCH' : 'OK'
                }
            })
            .sort((a, b) => b.unitsPerDay - a.unitsPerDay)

        return ApiResponse.success({
            velocity,
            periodDays: days,
            summary: {
                totalItems: velocity.length,
                fastMovers: velocity.filter(v => v.unitsPerDay >= 5).length,
                critical: velocity.filter(v => v.status === 'CRITICAL').length,
                lowStock: velocity.filter(v => v.status === 'LOW').length
            }
        })
    } catch (error) {
        console.error('[VELOCITY_GET]', error)
        return ApiResponse.error('Failed to generate velocity report')
    }
}
