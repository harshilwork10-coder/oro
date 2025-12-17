import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    analyzePricing,
    applyPriceSuggestion,
    applyBulkPriceSuggestions
} from '@/lib/ai/price-optimization'

/**
 * AI Price Optimization API
 * 
 * GET /api/ai/price-optimization - Get pricing analysis and suggestions
 * POST /api/ai/price-optimization - Apply price suggestions
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const analysis = await analyzePricing(user.franchiseId)

        return NextResponse.json(analysis)

    } catch (error) {
        console.error('[AI_PRICE_OPTIMIZATION_GET]', error)
        return NextResponse.json(
            { error: 'Failed to analyze pricing' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Check permissions - only owners/managers can change prices
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const { productId, newPrice, bulk } = body

        // Single product update
        if (productId && newPrice !== undefined) {
            const success = await applyPriceSuggestion(productId, newPrice)

            if (success) {
                return NextResponse.json({
                    success: true,
                    message: 'Price updated successfully'
                })
            } else {
                return NextResponse.json(
                    { error: 'Failed to update price' },
                    { status: 500 }
                )
            }
        }

        // Bulk update
        if (bulk && Array.isArray(bulk)) {
            const results = await applyBulkPriceSuggestions(bulk)

            return NextResponse.json({
                success: true,
                message: `Updated ${results.success} prices, ${results.failed} failed`,
                ...results
            })
        }

        return NextResponse.json(
            { error: 'Invalid request. Provide productId/newPrice or bulk array' },
            { status: 400 }
        )

    } catch (error) {
        console.error('[AI_PRICE_OPTIMIZATION_POST]', error)
        return NextResponse.json(
            { error: 'Failed to apply pricing changes' },
            { status: 500 }
        )
    }
}
