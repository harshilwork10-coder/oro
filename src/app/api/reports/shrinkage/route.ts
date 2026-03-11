/**
 * Shrinkage Report API
 *
 * GET — Expected vs actual inventory: items with negative stock or zero stock
 *        that had recent sales (indicating potential theft, damage, or counting errors)
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
        const categoryId = searchParams.get('categoryId')
        const days = parseInt(searchParams.get('days') || '30')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get all products with stock for this franchise
        const productWhere: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }
        if (categoryId) productWhere.categoryId = categoryId

        const products = await prisma.product.findMany({
            where: productWhere,
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                cost: true,
                price: true,
                stock: true,
                productCategory: { select: { name: true } }
            }
        })

        // Get sales quantities from transactions in the period
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
            _sum: { quantity: true }
        })

        const salesMap = new Map(salesData.map(s => [s.productId, s._sum.quantity || 0]))

        // Build shrinkage report
        const report = products.map(product => {
            const currentStock = product.stock || 0
            const soldQty = salesMap.get(product.id) || 0
            const cost = Number(product.cost || 0)

            // Report items where stock is negative (oversold/counting error)
            // or where stock is zero but there were recent sales
            const shrinkageUnits = currentStock < 0 ? Math.abs(currentStock) : 0
            const shrinkageDollars = shrinkageUnits * cost

            return {
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                sku: product.sku,
                category: product.productCategory?.name || 'Uncategorized',
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
        return ApiResponse.error('Failed to generate shrinkage report', 500)
    }
}
