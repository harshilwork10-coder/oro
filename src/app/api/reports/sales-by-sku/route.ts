/**
 * Sales by SKU/Barcode Report API
 *
 * GET — Item-level sales detail, searchable by barcode/SKU (essential for c-stores)
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
        const days = parseInt(searchParams.get('days') || '7')
        const search = searchParams.get('search') // Barcode or SKU search
        const categoryId = searchParams.get('categoryId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get sales grouped by product
        const salesData = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                type: 'PRODUCT',
                productId: { not: null },
                transaction: { franchiseId: user.franchiseId, status: 'COMPLETED', createdAt: { gte: since } }
            },
            _sum: { quantity: true, total: true },
            _count: { id: true }
        })

        const productIds = salesData.map(s => s.productId).filter(Boolean) as string[]

        // Get product info (with optional search filter)
        const productWhere: Record<string, unknown> = { id: { in: productIds } }
        if (categoryId) productWhere.categoryId = categoryId
        if (search) {
            productWhere.OR = [
                { barcode: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } }
            ]
        }

        const products = await prisma.product.findMany({
            where: productWhere,
            select: {
                id: true, name: true, barcode: true, sku: true,
                cost: true, price: true, vendor: true, brand: true,
                productCategory: { select: { name: true } }
            }
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        const items = salesData
            .filter(s => s.productId && productMap.has(s.productId!))
            .map(s => {
                const p = productMap.get(s.productId!)!
                const revenue = Number(s._sum.total || 0)
                const units = s._sum.quantity || 0

                return {
                    productId: p.id,
                    name: p.name,
                    barcode: p.barcode,
                    sku: p.sku,
                    category: p.productCategory?.name || 'Uncategorized',
                    vendor: p.vendor,
                    brand: p.brand,
                    unitsSold: units,
                    revenue: Math.round(revenue * 100) / 100,
                    avgPrice: units > 0 ? Math.round((revenue / units) * 100) / 100 : 0,
                    unitCost: Number(p.cost || 0),
                    transactions: s._count.id
                }
            })
            .sort((a, b) => b.unitsSold - a.unitsSold)

        // Paginate
        const start = (page - 1) * limit
        const paged = items.slice(start, start + limit)

        return NextResponse.json({
            items: paged,
            pagination: { page, pages: Math.ceil(items.length / limit), total: items.length },
            periodDays: days
        })
    } catch (error) {
        console.error('[SALES_SKU_GET]', error)
        return NextResponse.json({ error: 'Failed to generate sales by SKU' }, { status: 500 })
    }
}
