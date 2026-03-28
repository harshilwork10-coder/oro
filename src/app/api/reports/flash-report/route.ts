/**
 * Flash Report API — Quick daily pulse for owners
 *
 * GET — Returns today's revenue, transaction count, avg ticket,
 *        payment split, void/refund counts, top sellers, and alerts
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const franchiseId = user.franchiseId

        const { searchParams } = new URL(req.url)
        const dateStr = searchParams.get('date')
        const targetDate = dateStr ? new Date(dateStr) : new Date()
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

        // Transactions
        const transactions = await prisma.transaction.findMany({
            where: { franchiseId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
            select: { total: true, subtotal: true, tax: true, paymentMethod: true }
        })

        const revenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
        const cashSales = transactions
            .filter(t => t.paymentMethod === 'CASH')
            .reduce((s, t) => s + Number(t.total || 0), 0)
        const cardSales = transactions
            .filter(t => ['CREDIT_CARD', 'DEBIT_CARD'].includes(t.paymentMethod))
            .reduce((s, t) => s + Number(t.total || 0), 0)

        // Voids / Refunds
        const [voidCount, refundCount] = await Promise.all([
            prisma.transaction.count({
                where: { franchiseId, status: 'VOIDED', createdAt: { gte: dayStart, lte: dayEnd } }
            }),
            prisma.transaction.count({
                where: { franchiseId, status: 'REFUNDED', createdAt: { gte: dayStart, lte: dayEnd } }
            })
        ])

        // Top 5 products sold
        const topProducts = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                productId: { not: null },
                type: 'PRODUCT',
                transaction: { franchiseId, status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } }
            },
            _sum: { quantity: true, total: true },
            orderBy: { _sum: { total: 'desc' } },
            take: 5
        })

        // Get product names
        const productIds = topProducts.map(t => t.productId).filter(Boolean) as string[]
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true }
        })
        const productMap = new Map(products.map(p => [p.id, p.name]))

        // Drawer no-sale count
        let noSaleCount = 0
        try {
            noSaleCount = await prisma.drawerActivity.count({
                where: {
                    location: { franchiseId },
                    type: 'NO_SALE',
                    timestamp: { gte: dayStart, lte: dayEnd }
                }
            })
        } catch { /* DrawerActivity may not have data */ }

        const flash = {
            date: targetDate.toISOString().split('T')[0],
            revenue: Math.round(revenue * 100) / 100,
            transactionCount: transactions.length,
            avgTicket: transactions.length > 0
                ? Math.round((revenue / transactions.length) * 100) / 100
                : 0,
            cashSales: Math.round(cashSales * 100) / 100,
            cardSales: Math.round(cardSales * 100) / 100,
            voidCount,
            refundCount,
            noSaleCount,
            topSellers: topProducts.map(t => ({
                name: productMap.get(t.productId!) || 'Unknown',
                qtySold: t._sum.quantity || 0,
                revenue: Math.round(Number(t._sum.total || 0) * 100) / 100
            })),
            alerts: [
                ...(voidCount > 3 ? [`⚠️ ${voidCount} voids today — review needed`] : []),
                ...(noSaleCount > 5 ? [`🚨 ${noSaleCount} no-sale drawer opens — potential issue`] : []),
                ...(transactions.length === 0 ? [`⚠️ No sales recorded today`] : [])
            ]
        }

        return NextResponse.json({ flash })
    } catch (error) {
        console.error('[FLASH_REPORT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate flash report' }, { status: 500 })
    }
}
