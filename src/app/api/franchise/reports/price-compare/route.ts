'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Cross-location price comparison for same products
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')
        const search = searchParams.get('search')

        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, name: true }
        })

        if (locations.length < 2) {
            return ApiResponse.badRequest('Need at least 2 locations for comparison')
        }

        // Get items with location overrides
        const where: any = { franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true }
        if (categoryId) where.categoryId = categoryId
        if (search) where.name = { contains: search, mode: 'insensitive' }

        const items = await prisma.item.findMany({
            where,
            select: {
                id: true,
                name: true,
                barcode: true,
                price: true,
                cost: true,
                category: { select: { name: true } },
                locationOverrides: {
                    select: {
                        locationId: true,
                        price: true
                    }
                }
            },
            orderBy: { name: 'asc' },
            take: 100
        })

        // Build comparison
        const comparison = items.map(item => {
            const basePrice = Number(item.price)
            const baseCost = Number(item.cost || 0)

            const prices: Record<string, number> = {}
            for (const loc of locations) {
                const override = item.locationOverrides.find(o => o.locationId === loc.id)
                prices[loc.id] = override ? Number(override.price) : basePrice
            }

            const priceValues = Object.values(prices)
            const minPrice = Math.min(...priceValues)
            const maxPrice = Math.max(...priceValues)
            const variance = maxPrice - minPrice

            return {
                itemId: item.id,
                name: item.name,
                barcode: item.barcode,
                category: item.category?.name || 'Uncategorized',
                cost: baseCost,
                basePrice,
                locationPrices: prices,
                minPrice,
                maxPrice,
                variance: Math.round(variance * 100) / 100,
                hasVariance: variance > 0.01
            }
        })

        // Only show items with price variance (or all if requested)
        const showAll = searchParams.get('showAll') === 'true'
        const filtered = showAll ? comparison : comparison.filter(c => c.hasVariance)

        return ApiResponse.success({
            locations,
            items: filtered,
            summary: {
                totalCompared: comparison.length,
                withVariance: comparison.filter(c => c.hasVariance).length,
                maxVariance: Math.max(...comparison.map(c => c.variance), 0)
            }
        })
    } catch (error) {
        console.error('[PRICE_COMPARE_GET]', error)
        return ApiResponse.error('Failed to generate price comparison')
    }
}
