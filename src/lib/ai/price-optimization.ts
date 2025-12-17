/**
 * AI Price Optimization Service
 * 
 * Analyzes product pricing and suggests optimal prices based on:
 * - Cost and target margins
 * - Sales velocity
 * - Category benchmarks
 */

import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export interface PricingSuggestion {
    productId: string
    productName: string
    barcode?: string
    currentPrice: number
    cost: number | null
    currentMargin: number | null
    targetMargin: number
    suggestedPrice: number
    priceChange: number
    reason: string
    priority: 'high' | 'medium' | 'low'
    salesVolume: number
    revenueImpact: number
}

export interface PricingAnalysis {
    summary: {
        totalProducts: number
        productsWithCost: number
        belowTargetMargin: number
        aboveTargetMargin: number
        potentialRevenueGain: number
    }
    suggestions: PricingSuggestion[]
}

// Category-based target margins
const CATEGORY_MARGINS: Record<string, number> = {
    'beverages': 0.35,
    'soda': 0.40,
    'energy': 0.45,
    'water': 0.50,
    'snacks': 0.40,
    'chips': 0.40,
    'candy': 0.45,
    'tobacco': 0.12,
    'cigarettes': 0.10,
    'cigars': 0.15,
    'vape': 0.35,
    'alcohol': 0.25,
    'beer': 0.25,
    'wine': 0.30,
    'spirits': 0.28,
    'liquor': 0.28,
    'grocery': 0.30,
    'dairy': 0.25,
    'milk': 0.20,
    'frozen': 0.30,
    'ice cream': 0.35,
    'household': 0.35,
    'health': 0.40,
    'lottery': 0.05,
    'default': 0.30
}

/**
 * Get target margin for a product based on category
 */
function getTargetMargin(category: string | null): number {
    if (!category) return CATEGORY_MARGINS.default

    const lowerCategory = category.toLowerCase()

    for (const [key, margin] of Object.entries(CATEGORY_MARGINS)) {
        if (lowerCategory.includes(key)) {
            return margin
        }
    }

    return CATEGORY_MARGINS.default
}

/**
 * Calculate actual margin: (price - cost) / price
 */
function calculateMargin(price: number, cost: number | null): number | null {
    if (cost === null || cost <= 0 || price <= 0) return null
    return (price - cost) / price
}

/**
 * Calculate optimal price for target margin
 * Formula: price = cost / (1 - targetMargin)
 */
function calculateOptimalPrice(cost: number, targetMargin: number): number {
    const rawPrice = cost / (1 - targetMargin)
    // Round to X.X9 pricing (psychological pricing)
    return Math.ceil(rawPrice * 10) / 10 - 0.01
}

/**
 * Analyze all products and generate pricing suggestions
 */
export async function analyzePricing(franchiseId: string): Promise<PricingAnalysis> {
    // Get all active products with their sales data
    const thirtyDaysAgo = subDays(new Date(), 30)

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

    const suggestions: PricingSuggestion[] = []
    let belowTargetMargin = 0
    let aboveTargetMargin = 0
    let productsWithCost = 0
    let potentialRevenueGain = 0

    for (const product of products) {
        const price = Number(product.price)
        const cost = product.cost ? Number(product.cost) : null

        if (cost !== null) {
            productsWithCost++
        }

        // Calculate sales volume (units sold in last 30 days)
        const salesVolume = product.lineItems.reduce((sum, item) => sum + item.quantity, 0)

        // Get category from either the relation or legacy field
        const categoryName = product.productCategory?.name || product.category || null

        const currentMargin = calculateMargin(price, cost)
        const targetMargin = getTargetMargin(categoryName)

        // Can only suggest if we have cost data
        if (cost === null) continue

        const suggestedPrice = calculateOptimalPrice(cost, targetMargin)
        const priceChange = suggestedPrice - price

        // Determine priority and reason
        let priority: 'high' | 'medium' | 'low' = 'low'
        let reason = ''

        if (currentMargin !== null) {
            const marginDiff = targetMargin - currentMargin

            if (marginDiff > 0.10) {
                // Margin is more than 10% below target
                priority = 'high'
                reason = `Margin ${(currentMargin * 100).toFixed(1)}% is well below target ${(targetMargin * 100).toFixed(0)}%`
                belowTargetMargin++
            } else if (marginDiff > 0.05) {
                // Margin is 5-10% below target
                priority = 'medium'
                reason = `Margin ${(currentMargin * 100).toFixed(1)}% is below target ${(targetMargin * 100).toFixed(0)}%`
                belowTargetMargin++
            } else if (marginDiff < -0.15 && salesVolume < 5) {
                // Over-priced with low sales
                priority = 'medium'
                reason = `Over-priced with low sales volume. Consider lowering price.`
                aboveTargetMargin++
            } else if (priceChange > 0.10) {
                // Small opportunity
                priority = 'low'
                reason = `Small pricing opportunity`
            } else {
                // Price is good, skip
                continue
            }
        }

        // Calculate revenue impact
        const revenueImpact = priceChange * salesVolume
        if (revenueImpact > 0) {
            potentialRevenueGain += revenueImpact
        }

        suggestions.push({
            productId: product.id,
            productName: product.name,
            barcode: product.barcode || undefined,
            currentPrice: price,
            cost,
            currentMargin,
            targetMargin,
            suggestedPrice,
            priceChange,
            reason,
            priority,
            salesVolume,
            revenueImpact
        })
    }

    // Sort by priority and revenue impact
    suggestions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return b.revenueImpact - a.revenueImpact
    })

    return {
        summary: {
            totalProducts: products.length,
            productsWithCost,
            belowTargetMargin,
            aboveTargetMargin,
            potentialRevenueGain: Math.round(potentialRevenueGain * 100) / 100
        },
        suggestions
    }
}

/**
 * Apply a single price suggestion
 */
export async function applyPriceSuggestion(productId: string, newPrice: number): Promise<boolean> {
    try {
        await prisma.product.update({
            where: { id: productId },
            data: { price: newPrice }
        })
        return true
    } catch (error) {
        console.error('[PRICE_OPTIMIZATION] Failed to apply price:', error)
        return false
    }
}

/**
 * Apply multiple price suggestions in bulk
 */
export async function applyBulkPriceSuggestions(
    suggestions: { productId: string; newPrice: number }[]
): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const { productId, newPrice } of suggestions) {
        const result = await applyPriceSuggestion(productId, newPrice)
        if (result) {
            success++
        } else {
            failed++
        }
    }

    return { success, failed }
}
