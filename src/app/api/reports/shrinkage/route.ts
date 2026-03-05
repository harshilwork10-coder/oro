// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Shrinkage report: expected vs actual inventory
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')
        const days = parseInt(searchParams.get('days') || '30')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get all items with stock for this franchise
        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT' }
        if (categoryId) where.categoryId = categoryId

        const items = await prisma.item.findMany({
            where,
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                cost: true,
                price: true,
                stock: true,
                category: { select: { name: true } }
            }
        })

        // Get sales quantities from transactions in the period
        const salesData = await prisma.transactionLineItem.groupBy({
            by: ['itemId'],
            where: {
                transaction: {
                    locationId,
                    status: 'COMPLETED',
                    createdAt: { gte: since }
                }
            },
            _sum: { quantity: true }
        })

        const salesMap = new Map(salesData.map(s => [s.itemId, s._sum.quantity || 0]))

        // Build shrinkage report
        const report = items.map(item => {
            const currentStock = item.stock || 0
            const soldQty = salesMap.get(item.id) || 0
            const cost = Number(item.cost || 0)

            // Expected stock = what we had - what we sold
            // Since we don't have opening stock snapshot, we report
            // items where current stock is negative (oversold/counting error)
            // or where stock seems suspiciously low relative to sales
            const shrinkageUnits = currentStock < 0 ? Math.abs(currentStock) : 0
            const shrinkageDollars = shrinkageUnits * cost

            return {
                itemId: item.id,
                name: item.name,
                barcode: item.barcode,
                sku: item.sku,
                category: item.category?.name || 'Uncategorized',
                currentStock,
                soldInPeriod: soldQty,
                unitCost: cost,
                shrinkageUnits,
                shrinkageDollars: Math.round(shrinkageDollars * 100) / 100,
                status: currentStock < 0 ? 'CRITICAL' : currentStock === 0 && soldQty > 0 ? 'WARNING' : 'OK'
            }
        }).filter(r => r.shrinkageUnits > 0 || r.status !== 'OK')
            .sort((a, b) => b.shrinkageDollars - a.shrinkageDollars)

        const summary = {
            totalItems: report.length,
            totalShrinkageUnits: report.reduce((s, r) => s + r.shrinkageUnits, 0),
            totalShrinkageDollars: Math.round(report.reduce((s, r) => s + r.shrinkageDollars, 0) * 100) / 100,
            critical: report.filter(r => r.status === 'CRITICAL').length,
            warning: report.filter(r => r.status === 'WARNING').length
        }

        return ApiResponse.success({ report, summary, periodDays: days })
    } catch (error) {
        console.error('[SHRINKAGE_GET]', error)
        return ApiResponse.error('Failed to generate shrinkage report')
    }
}
