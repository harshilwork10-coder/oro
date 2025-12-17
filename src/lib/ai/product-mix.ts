/**
 * AI Product Mix Analysis Service
 * 
 * Analyzes product portfolio using BCG Matrix methodology:
 * - Stars: High sales + High margin
 * - Cash Cows: High sales + Low margin
 * - Question Marks: Low sales + High margin
 * - Dogs: Low sales + Low margin
 */

import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export type ProductClassification = 'star' | 'cash_cow' | 'question_mark' | 'dog'

export interface ProductMixItem {
    productId: string
    productName: string
    barcode?: string
    category?: string

    // Metrics
    unitsSold: number
    revenue: number
    cost: number | null
    grossProfit: number | null
    margin: number | null
    stockTurnRate: number
    currentStock: number

    // Classification
    classification: ProductClassification
    salesVelocity: 'high' | 'medium' | 'low'
    marginLevel: 'high' | 'medium' | 'low'

    // Recommendation
    recommendation: string
    action: 'stock_more' | 'maintain' | 'promote' | 'discontinue' | 'reprice'
    priority: 'high' | 'medium' | 'low'
}

export interface ProductMixAnalysis {
    summary: {
        totalProducts: number
        analyzedProducts: number
        stars: number
        cashCows: number
        questionMarks: number
        dogs: number
        totalRevenue: number
        totalProfit: number
    }
    products: ProductMixItem[]
    topRecommendations: ProductMixItem[]
}

/**
 * Calculate stock turn rate: units sold / average stock
 */
function calculateStockTurn(unitsSold: number, currentStock: number): number {
    if (currentStock <= 0) return unitsSold > 0 ? 10 : 0 // High if sold out
    return unitsSold / currentStock
}

/**
 * Classify a product into BCG matrix quadrant
 */
function classifyProduct(
    salesVelocity: 'high' | 'medium' | 'low',
    marginLevel: 'high' | 'medium' | 'low'
): ProductClassification {
    if (salesVelocity === 'high' && (marginLevel === 'high' || marginLevel === 'medium')) {
        return 'star'
    }
    if (salesVelocity === 'high' && marginLevel === 'low') {
        return 'cash_cow'
    }
    if (salesVelocity === 'low' && (marginLevel === 'high' || marginLevel === 'medium')) {
        return 'question_mark'
    }
    return 'dog'
}

/**
 * Generate recommendation based on classification
 */
function getRecommendation(
    classification: ProductClassification,
    stockTurnRate: number,
    currentStock: number,
    margin: number | null
): { recommendation: string; action: ProductMixItem['action']; priority: 'high' | 'medium' | 'low' } {
    switch (classification) {
        case 'star':
            if (currentStock < 10) {
                return {
                    recommendation: 'Top performer running low! Reorder immediately.',
                    action: 'stock_more',
                    priority: 'high'
                }
            }
            return {
                recommendation: 'Keep stocking. This product drives revenue and profit.',
                action: 'maintain',
                priority: 'low'
            }

        case 'cash_cow':
            if (margin !== null && margin < 0.15) {
                return {
                    recommendation: 'High volume but low margin. Consider slight price increase.',
                    action: 'reprice',
                    priority: 'medium'
                }
            }
            return {
                recommendation: 'Steady performer. Maintain stock levels.',
                action: 'maintain',
                priority: 'low'
            }

        case 'question_mark':
            if (stockTurnRate < 0.5) {
                return {
                    recommendation: 'Good margin but slow sales. Try promotional placement or discount.',
                    action: 'promote',
                    priority: 'medium'
                }
            }
            return {
                recommendation: 'Has potential. Monitor sales trend.',
                action: 'maintain',
                priority: 'low'
            }

        case 'dog':
            if (currentStock > 20 && stockTurnRate < 0.2) {
                return {
                    recommendation: 'Poor performer with excess stock. Consider clearance or discontinue.',
                    action: 'discontinue',
                    priority: 'high'
                }
            }
            if (stockTurnRate < 0.3) {
                return {
                    recommendation: 'Underperforming. Review if product should be kept.',
                    action: 'discontinue',
                    priority: 'medium'
                }
            }
            return {
                recommendation: 'Low performer. Do not reorder unless sales improve.',
                action: 'maintain',
                priority: 'low'
            }
    }
}

/**
 * Analyze product mix for a franchise
 */
export async function analyzeProductMix(franchiseId: string): Promise<ProductMixAnalysis> {
    const thirtyDaysAgo = subDays(new Date(), 30)

    // Get all products with sales data
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
                        createdAt: { gte: thirtyDaysAgo },
                        status: 'COMPLETED'
                    }
                },
                include: {
                    transaction: true
                }
            }
        }
    })

    // Calculate metrics for each product
    const productMetrics: ProductMixItem[] = []
    let totalRevenue = 0
    let totalProfit = 0

    // First pass: calculate all metrics
    const metricsRaw = products.map(product => {
        const unitsSold = product.lineItems.reduce((sum, item) => sum + item.quantity, 0)
        const revenue = product.lineItems.reduce((sum, item) => sum + Number(item.total), 0)
        const cost = product.cost ? Number(product.cost) * unitsSold : null
        const grossProfit = cost !== null ? revenue - cost : null
        const margin = cost !== null && revenue > 0 ? (revenue - cost) / revenue : null
        const stockTurnRate = calculateStockTurn(unitsSold, product.stock)

        totalRevenue += revenue
        if (grossProfit !== null) totalProfit += grossProfit

        return {
            product,
            unitsSold,
            revenue,
            cost,
            grossProfit,
            margin,
            stockTurnRate
        }
    })

    // Calculate thresholds (median-based)
    const salesValues = metricsRaw.filter(m => m.unitsSold > 0).map(m => m.unitsSold)
    const marginValues = metricsRaw.filter(m => m.margin !== null).map(m => m.margin!)

    const medianSales = salesValues.length > 0
        ? salesValues.sort((a, b) => a - b)[Math.floor(salesValues.length / 2)]
        : 5
    const medianMargin = marginValues.length > 0
        ? marginValues.sort((a, b) => a - b)[Math.floor(marginValues.length / 2)]
        : 0.25

    // Second pass: classify products
    let stars = 0, cashCows = 0, questionMarks = 0, dogs = 0

    for (const { product, unitsSold, revenue, cost, grossProfit, margin, stockTurnRate } of metricsRaw) {
        // Determine velocity level
        let salesVelocity: 'high' | 'medium' | 'low' = 'low'
        if (unitsSold >= medianSales * 2) salesVelocity = 'high'
        else if (unitsSold >= medianSales * 0.5) salesVelocity = 'medium'

        // Determine margin level
        let marginLevel: 'high' | 'medium' | 'low' = 'medium'
        if (margin !== null) {
            if (margin >= medianMargin * 1.3) marginLevel = 'high'
            else if (margin < medianMargin * 0.7) marginLevel = 'low'
        }

        const classification = classifyProduct(salesVelocity, marginLevel)
        const { recommendation, action, priority } = getRecommendation(
            classification,
            stockTurnRate,
            product.stock,
            margin
        )

        // Count classifications
        switch (classification) {
            case 'star': stars++; break
            case 'cash_cow': cashCows++; break
            case 'question_mark': questionMarks++; break
            case 'dog': dogs++; break
        }

        productMetrics.push({
            productId: product.id,
            productName: product.name,
            barcode: product.barcode || undefined,
            category: product.productCategory?.name || product.category || undefined,
            unitsSold,
            revenue,
            cost,
            grossProfit,
            margin,
            stockTurnRate: Math.round(stockTurnRate * 100) / 100,
            currentStock: product.stock,
            classification,
            salesVelocity,
            marginLevel,
            recommendation,
            action,
            priority
        })
    }

    // Sort by priority and revenue impact
    productMetrics.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return b.revenue - a.revenue
    })

    // Top recommendations (high priority items)
    const topRecommendations = productMetrics.filter(p => p.priority === 'high').slice(0, 10)

    return {
        summary: {
            totalProducts: products.length,
            analyzedProducts: metricsRaw.filter(m => m.unitsSold > 0).length,
            stars,
            cashCows,
            questionMarks,
            dogs,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100
        },
        products: productMetrics,
        topRecommendations
    }
}
