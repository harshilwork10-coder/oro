/**
 * Sales by SKU/Barcode Report API
 *
 * GET — Item-level sales detail, searchable by barcode/SKU (essential for c-stores)
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

        return ApiResponse.success({
            items: paged,
            pagination: { page, pages: Math.ceil(items.length / limit), total: items.length },
            periodDays: days
        })
    } catch (error) {
        console.error('[SALES_SKU_GET]', error)
        return ApiResponse.error('Failed to generate sales by SKU', 500)
    }
}
