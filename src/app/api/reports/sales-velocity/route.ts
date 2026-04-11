/**
 * Sales Velocity Report API
 *
 * GET — Items ranked by sell-through speed: units/day, days-of-stock remaining
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
        const categoryId = searchParams.get('categoryId')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get sales grouped by product
        const salesData = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: {
                    franchiseId: user.franchiseId,
                    status: 'COMPLETED',
                    createdAt: { gte: since }
                }
            },
            _sum: { quantity: true, total: true },
            _count: { id: true }
        })

        // Get product details
        const productIds = salesData.map(s => s.productId).filter(Boolean) as string[]
        const productWhere: Record<string, unknown> = { id: { in: productIds } }
        if (categoryId) productWhere.categoryId = categoryId

        const products = await prisma.product.findMany({
            where: productWhere,
            select: {
                id: true, name: true, barcode: true, stock: true, cost: true, price: true,
                productCategory: { select: { name: true } }
            }
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        const velocity = salesData
            .filter(s => s.productId && productMap.has(s.productId!))
            .map(s => {
                const product = productMap.get(s.productId!)!
                const unitsSold = s._sum.quantity || 0
                const unitsPerDay = unitsSold / days
                const currentStock = product.stock || 0
                const daysOfStock = unitsPerDay > 0 ? Math.round(currentStock / unitsPerDay) : 999

                return {
                    productId: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    category: product.productCategory?.name || 'Uncategorized',
                    unitsSold,
                    revenue: Math.round(Number(s._sum.total || 0) * 100) / 100,
                    unitsPerDay: Math.round(unitsPerDay * 10) / 10,
                    currentStock,
                    daysOfStock,
                    status: daysOfStock <= 3 ? 'CRITICAL' : daysOfStock <= 7 ? 'LOW' : daysOfStock <= 14 ? 'WATCH' : 'OK'
                }
            })
            .sort((a, b) => b.unitsPerDay - a.unitsPerDay)

        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to generate velocity report' }, { status: 500 })
    }
}
