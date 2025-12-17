/**
 * AI Merchandising Service
 * 
 * Analyzes category performance, cross-sell patterns, and placement recommendations
 */

import { prisma } from '@/lib/prisma'
import { subDays, getHours, format } from 'date-fns'

export interface CategoryPerformance {
    categoryId: string | null
    categoryName: string
    productCount: number
    unitsSold: number
    revenue: number
    averagePrice: number
    topProducts: { name: string; revenue: number }[]
    hourlyTrend: { hour: number; sales: number }[]
    peakHours: number[]
}

export interface CrossSellPattern {
    productA: { id: string; name: string }
    productB: { id: string; name: string }
    coOccurrences: number
    confidence: number // How often B is bought when A is bought
    suggestion: string
}

export interface PlacementRecommendation {
    type: 'checkout_zone' | 'end_cap' | 'cross_merchandise' | 'bundle'
    title: string
    description: string
    products: { id: string; name: string }[]
    expectedImpact: string
    priority: 'high' | 'medium' | 'low'
}

export interface MerchandisingAnalysis {
    summary: {
        totalCategories: number
        topCategory: string
        topCategoryRevenue: number
        crossSellOpportunities: number
    }
    categoryPerformance: CategoryPerformance[]
    crossSellPatterns: CrossSellPattern[]
    recommendations: PlacementRecommendation[]
}

/**
 * Analyze category performance
 */
async function analyzeCategoryPerformance(
    franchiseId: string,
    startDate: Date
): Promise<CategoryPerformance[]> {
    // Get all products with sales data grouped by category
    const products = await prisma.product.findMany({
        where: {
            franchiseId,
            isActive: true
        },
        include: {
            productCategory: true,
            lineItems: {
                where: {
                    transaction: {
                        createdAt: { gte: startDate },
                        status: 'COMPLETED'
                    }
                },
                include: {
                    transaction: true
                }
            }
        }
    })

    // Group by category
    const categoryMap = new Map<string, {
        categoryId: string | null
        categoryName: string
        products: typeof products
        totalUnits: number
        totalRevenue: number
        hourlyBreakdown: Record<number, number>
    }>()

    for (const product of products) {
        const categoryKey = product.productCategory?.name || product.category || 'Uncategorized'
        const categoryId = product.productCategory?.id || null

        if (!categoryMap.has(categoryKey)) {
            categoryMap.set(categoryKey, {
                categoryId,
                categoryName: categoryKey,
                products: [],
                totalUnits: 0,
                totalRevenue: 0,
                hourlyBreakdown: {}
            })
        }

        const cat = categoryMap.get(categoryKey)!
        cat.products.push(product)

        for (const item of product.lineItems) {
            cat.totalUnits += item.quantity
            cat.totalRevenue += Number(item.total)

            // Track hourly sales
            const hour = getHours(item.transaction.createdAt)
            cat.hourlyBreakdown[hour] = (cat.hourlyBreakdown[hour] || 0) + Number(item.total)
        }
    }

    // Convert to array and calculate metrics
    const results: CategoryPerformance[] = []

    for (const [categoryName, data] of categoryMap.entries()) {
        // Get top products in category
        const productSales = data.products.map(p => ({
            name: p.name,
            revenue: p.lineItems.reduce((sum, item) => sum + Number(item.total), 0)
        })).sort((a, b) => b.revenue - a.revenue)

        // Convert hourly breakdown to array
        const hourlyTrend = Object.entries(data.hourlyBreakdown)
            .map(([hour, sales]) => ({ hour: parseInt(hour), sales }))
            .sort((a, b) => a.hour - b.hour)

        // Find peak hours (top 3 by sales)
        const peakHours = [...hourlyTrend]
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 3)
            .map(h => h.hour)

        results.push({
            categoryId: data.categoryId,
            categoryName,
            productCount: data.products.length,
            unitsSold: data.totalUnits,
            revenue: Math.round(data.totalRevenue * 100) / 100,
            averagePrice: data.totalUnits > 0
                ? Math.round((data.totalRevenue / data.totalUnits) * 100) / 100
                : 0,
            topProducts: productSales.slice(0, 5),
            hourlyTrend,
            peakHours
        })
    }

    // Sort by revenue
    return results.sort((a, b) => b.revenue - a.revenue)
}

/**
 * Find cross-sell patterns (items frequently bought together)
 */
async function findCrossSellPatterns(
    franchiseId: string,
    startDate: Date
): Promise<CrossSellPattern[]> {
    // Get transactions with line items
    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId,
            createdAt: { gte: startDate },
            status: 'COMPLETED'
        },
        include: {
            lineItems: {
                include: {
                    product: true
                }
            }
        }
    })

    // Count co-occurrences
    const coOccurrences = new Map<string, {
        productAId: string
        productAName: string
        productBId: string
        productBName: string
        count: number
        aCount: number
    }>()

    // Track how many times each product appears
    const productCounts = new Map<string, number>()

    for (const tx of transactions) {
        const productIds = tx.lineItems
            .filter(item => item.product)
            .map(item => ({
                id: item.product!.id,
                name: item.product!.name
            }))

        // Count individual products
        for (const p of productIds) {
            productCounts.set(p.id, (productCounts.get(p.id) || 0) + 1)
        }

        // Count co-occurrences (pairs)
        for (let i = 0; i < productIds.length; i++) {
            for (let j = i + 1; j < productIds.length; j++) {
                const [pA, pB] = productIds[i].id < productIds[j].id
                    ? [productIds[i], productIds[j]]
                    : [productIds[j], productIds[i]]

                const key = `${pA.id}:${pB.id}`

                if (!coOccurrences.has(key)) {
                    coOccurrences.set(key, {
                        productAId: pA.id,
                        productAName: pA.name,
                        productBId: pB.id,
                        productBName: pB.name,
                        count: 0,
                        aCount: 0
                    })
                }

                const data = coOccurrences.get(key)!
                data.count++
                data.aCount = productCounts.get(pA.id) || 1
            }
        }
    }

    // Convert to array and calculate confidence
    const patterns: CrossSellPattern[] = []

    for (const [key, data] of coOccurrences.entries()) {
        if (data.count < 3) continue // Minimum threshold

        const confidence = data.count / data.aCount

        patterns.push({
            productA: { id: data.productAId, name: data.productAName },
            productB: { id: data.productBId, name: data.productBName },
            coOccurrences: data.count,
            confidence: Math.round(confidence * 100) / 100,
            suggestion: confidence > 0.5
                ? `Place ${data.productBName} near ${data.productAName} - bought together ${(confidence * 100).toFixed(0)}% of the time`
                : `Cross-merchandise ${data.productAName} with ${data.productBName}`
        })
    }

    // Sort by co-occurrences
    return patterns.sort((a, b) => b.coOccurrences - a.coOccurrences).slice(0, 20)
}

/**
 * Generate placement recommendations
 */
function generateRecommendations(
    categoryPerformance: CategoryPerformance[],
    crossSellPatterns: CrossSellPattern[]
): PlacementRecommendation[] {
    const recommendations: PlacementRecommendation[] = []

    // Checkout zone recommendations (impulse buys from high-margin categories)
    const impulseBuyCategories = ['Candy', 'Snacks', 'Energy', 'Gum', 'Beverages']

    for (const cat of categoryPerformance) {
        if (impulseBuyCategories.some(ic => cat.categoryName.toLowerCase().includes(ic.toLowerCase()))) {
            if (cat.unitsSold > 0 && cat.topProducts.length > 0) {
                recommendations.push({
                    type: 'checkout_zone',
                    title: `${cat.categoryName} at Checkout`,
                    description: `Place top-selling ${cat.categoryName.toLowerCase()} items near checkout for impulse purchases`,
                    products: cat.topProducts.slice(0, 3).map(p => ({ id: '', name: p.name })),
                    expectedImpact: '+10-15% category sales',
                    priority: 'high'
                })
            }
        }
    }

    // Cross-sell recommendations
    for (const pattern of crossSellPatterns.slice(0, 5)) {
        if (pattern.confidence > 0.3) {
            recommendations.push({
                type: 'cross_merchandise',
                title: `${pattern.productA.name} + ${pattern.productB.name}`,
                description: pattern.suggestion,
                products: [pattern.productA, pattern.productB],
                expectedImpact: `+${Math.round(pattern.confidence * 20)}% lift on paired sales`,
                priority: pattern.confidence > 0.5 ? 'high' : 'medium'
            })
        }
    }

    // End cap recommendations for top sellers
    if (categoryPerformance.length > 0) {
        const topCategory = categoryPerformance[0]

        recommendations.push({
            type: 'end_cap',
            title: `Feature ${topCategory.categoryName}`,
            description: `Create an end-cap display for your top category. Revenue: $${topCategory.revenue.toFixed(2)}`,
            products: topCategory.topProducts.slice(0, 4).map(p => ({ id: '', name: p.name })),
            expectedImpact: '+8-12% category visibility',
            priority: 'medium'
        })
    }

    // Bundle opportunities from cross-sell
    const highConfidencePairs = crossSellPatterns.filter(p => p.confidence > 0.4).slice(0, 3)
    for (const pair of highConfidencePairs) {
        recommendations.push({
            type: 'bundle',
            title: `Bundle: ${pair.productA.name} + ${pair.productB.name}`,
            description: `Create a combo deal - customers buy these together ${(pair.confidence * 100).toFixed(0)}% of the time`,
            products: [pair.productA, pair.productB],
            expectedImpact: '+$0.50-1.00 average ticket',
            priority: 'medium'
        })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

/**
 * Full merchandising analysis
 */
export async function analyzeMerchandising(franchiseId: string): Promise<MerchandisingAnalysis> {
    const thirtyDaysAgo = subDays(new Date(), 30)

    const categoryPerformance = await analyzeCategoryPerformance(franchiseId, thirtyDaysAgo)
    const crossSellPatterns = await findCrossSellPatterns(franchiseId, thirtyDaysAgo)
    const recommendations = generateRecommendations(categoryPerformance, crossSellPatterns)

    const topCategory = categoryPerformance[0] || { categoryName: 'N/A', revenue: 0 }

    return {
        summary: {
            totalCategories: categoryPerformance.length,
            topCategory: topCategory.categoryName,
            topCategoryRevenue: topCategory.revenue,
            crossSellOpportunities: crossSellPatterns.filter(p => p.confidence > 0.3).length
        },
        categoryPerformance,
        crossSellPatterns,
        recommendations
    }
}
