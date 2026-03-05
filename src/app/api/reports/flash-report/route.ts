// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Daily flash report (auto-summary for owner)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId && !user.franchiseId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const dateStr = searchParams.get('date')
        const targetDate = dateStr ? new Date(dateStr) : new Date()
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

        const locationWhere = locationId ? { locationId } : { location: { franchiseId: user.franchiseId } }

        // Transactions
        const transactions = await prisma.transaction.findMany({
            where: { ...locationWhere, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
            select: { total: true, subtotal: true, taxAmount: true, paymentMethod: true }
        })

        const revenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
        const cashSales = transactions.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.total || 0), 0)
        const cardSales = transactions.filter(t => t.paymentMethod === 'CARD').reduce((s, t) => s + Number(t.total || 0), 0)

        // Voids / Refunds
        const voids = await prisma.transaction.count({
            where: { ...locationWhere, status: 'VOIDED', createdAt: { gte: dayStart, lte: dayEnd } }
        })
        const refunds = await prisma.transaction.count({
            where: { ...locationWhere, status: 'REFUNDED', createdAt: { gte: dayStart, lte: dayEnd } }
        })

        // Top 5 items sold
        const topItems = await prisma.transactionLineItem.groupBy({
            by: ['itemId'],
            where: {
                transaction: { ...locationWhere, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } }
            },
            _sum: { quantity: true, total: true },
            orderBy: { _sum: { total: 'desc' } },
            take: 5
        })

        const itemIds = topItems.map(t => t.itemId).filter(Boolean) as string[]
        const items = await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true }
        })
        const itemMap = new Map(items.map(i => [i.id, i.name]))

        // Drawer activities
        const noSaleCount = await (prisma as any).drawerActivity.count({
            where: { ...locationWhere, type: 'NO_SALE', timestamp: { gte: dayStart, lte: dayEnd } }
        })

        const flash = {
            date: targetDate.toISOString().split('T')[0],
            revenue: Math.round(revenue * 100) / 100,
            transactionCount: transactions.length,
            avgTicket: transactions.length > 0 ? Math.round((revenue / transactions.length) * 100) / 100 : 0,
            cashSales: Math.round(cashSales * 100) / 100,
            cardSales: Math.round(cardSales * 100) / 100,
            voidCount: voids,
            refundCount: refunds,
            noSaleCount,
            topSellers: topItems.map(t => ({
                name: itemMap.get(t.itemId!) || 'Unknown',
                qtySold: t._sum.quantity || 0,
                revenue: Math.round(Number(t._sum.total || 0) * 100) / 100
            })),
            alerts: [
                ...(voids > 3 ? [`⚠️ ${voids} voids today — review needed`] : []),
                ...(noSaleCount > 5 ? [`🚨 ${noSaleCount} no-sale drawer opens — potential issue`] : []),
                ...(transactions.length === 0 ? [`⚠️ No sales recorded today`] : [])
            ]
        }

        return ApiResponse.success({ flash })
    } catch (error) {
        console.error('[FLASH_REPORT_GET]', error)
        return ApiResponse.error('Failed to generate flash report')
    }
}
