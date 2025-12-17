import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeProductMix } from '@/lib/ai/product-mix'

/**
 * AI Product Mix Analysis API
 * 
 * GET /api/ai/product-mix - Get product portfolio analysis
 * 
 * Returns BCG Matrix classification and recommendations for all products
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

        const analysis = await analyzeProductMix(user.franchiseId)

        return NextResponse.json(analysis)

    } catch (error) {
        console.error('[AI_PRODUCT_MIX]', error)
        return NextResponse.json(
            { error: 'Failed to analyze product mix' },
            { status: 500 }
        )
    }
}
