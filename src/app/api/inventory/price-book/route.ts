import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * Price Book Management API
 * 
 * GET  — Preview price changes before applying
 * POST — Apply bulk price adjustments
 * 
 * Supports:
 *   - Percentage increase/decrease by category
 *   - Fixed amount increase/decrease by category
 *   - Round to nearest .X9 (e.g., $2.49, $3.99)
 *   - Margin-based pricing (cost + markup%)
 */

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Get categories with product counts and price ranges
        const categories = await prisma.productCategory.findMany({
            where: { franchiseId },
            select: {
                id: true,
                name: true,
                _count: { select: { products: true } },
                products: {
                    select: { price: true, cost: true },
                    where: { isActive: true },
                }
            },
            orderBy: { name: 'asc' }
        })

        const categoryStats = categories.map(cat => {
            const prices = cat.products.map(p => Number(p.price))
            const costs = cat.products.map(p => Number(p.cost || 0))
            return {
                id: cat.id,
                name: cat.name,
                productCount: cat._count.products,
                priceRange: prices.length ? {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                    avg: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
                } : null,
                avgCost: costs.filter(c => c > 0).length
                    ? Math.round((costs.filter(c => c > 0).reduce((s, c) => s + c, 0) / costs.filter(c => c > 0).length) * 100) / 100
                    : null,
                avgMargin: prices.length && costs.filter(c => c > 0).length
                    ? Math.round(((prices.reduce((s, p) => s + p, 0) / prices.length - costs.filter(c => c > 0).reduce((s, c) => s + c, 0) / costs.filter(c => c > 0).length) / (prices.reduce((s, p) => s + p, 0) / prices.length)) * 10000) / 100
                    : null,
            }
        })

        // Also get total product count
        const totalProducts = await prisma.product.count({
            where: { franchiseId, isActive: true }
        })

        return NextResponse.json({
            categories: categoryStats,
            totalProducts,
            adjustmentTypes: [
                { id: 'PERCENT_INCREASE', label: 'Increase by %', icon: '📈' },
                { id: 'PERCENT_DECREASE', label: 'Decrease by %', icon: '📉' },
                { id: 'FIXED_INCREASE', label: 'Increase by $', icon: '💲' },
                { id: 'FIXED_DECREASE', label: 'Decrease by $', icon: '💰' },
                { id: 'SET_MARGIN', label: 'Set margin %', icon: '📊' },
                { id: 'ROUND_UP', label: 'Round to .X9', icon: '🔄' },
            ],
        })

    } catch (error) {
        console.error('PriceBook GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await req.json()
        const { action, categoryId, adjustmentType, value, preview } = body

        if (action === 'adjust') {
            if (!categoryId || !adjustmentType) {
                return NextResponse.json({ error: 'categoryId and adjustmentType required' }, { status: 400 })
            }

            // Fetch products in this category
            const products = await prisma.product.findMany({
                where: {
                    franchiseId,
                    isActive: true,
                    categoryId: categoryId === 'ALL' ? undefined : categoryId,
                },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    cost: true,
                    barcode: true,
                }
            })

            const adjustedProducts = products.map(product => {
                const currentPrice = Number(product.price)
                const cost = Number(product.cost || 0)
                let newPrice = currentPrice

                switch (adjustmentType) {
                    case 'PERCENT_INCREASE':
                        newPrice = currentPrice * (1 + (value || 0) / 100)
                        break
                    case 'PERCENT_DECREASE':
                        newPrice = currentPrice * (1 - (value || 0) / 100)
                        break
                    case 'FIXED_INCREASE':
                        newPrice = currentPrice + (value || 0)
                        break
                    case 'FIXED_DECREASE':
                        newPrice = Math.max(0.01, currentPrice - (value || 0))
                        break
                    case 'SET_MARGIN':
                        // Price = Cost / (1 - margin%)
                        if (cost > 0) {
                            newPrice = cost / (1 - (value || 30) / 100)
                        }
                        break
                    case 'ROUND_UP':
                        // Round to nearest .X9 (e.g., 2.29 → 2.29, 2.31 → 2.39, 2.50 → 2.59)
                        newPrice = Math.ceil(currentPrice * 10) / 10 - 0.01
                        if (newPrice < currentPrice) newPrice += 0.10
                        break
                }

                newPrice = Math.round(newPrice * 100) / 100 // Round to cents

                return {
                    id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    currentPrice,
                    newPrice,
                    change: Math.round((newPrice - currentPrice) * 100) / 100,
                    changePercent: currentPrice > 0 ? Math.round(((newPrice - currentPrice) / currentPrice) * 10000) / 100 : 0,
                }
            })

            // Preview only — don't save
            if (preview) {
                return NextResponse.json({
                    preview: true,
                    categoryId,
                    adjustmentType,
                    value,
                    affected: adjustedProducts.length,
                    products: adjustedProducts.slice(0, 50),
                    totalProducts: adjustedProducts.length,
                    summary: {
                        avgChange: adjustedProducts.length
                            ? Math.round((adjustedProducts.reduce((s, p) => s + p.change, 0) / adjustedProducts.length) * 100) / 100
                            : 0,
                        totalRevImpact: Math.round(adjustedProducts.reduce((s, p) => s + p.change, 0) * 100) / 100,
                    }
                })
            }

            // Apply changes
            let updated = 0
            for (const product of adjustedProducts) {
                if (product.newPrice !== product.currentPrice) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { price: product.newPrice },
                    })
                    updated++
                }
            }

            return NextResponse.json({
                success: true,
                applied: true,
                updated,
                adjustmentType,
                value,
                categoryId,
                appliedAt: new Date().toISOString(),
                message: `Updated ${updated} product prices`,
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('PriceBook POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
