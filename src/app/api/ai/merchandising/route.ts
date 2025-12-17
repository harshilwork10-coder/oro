import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeMerchandising } from '@/lib/ai/merchandising'

/**
 * AI Merchandising API
 * 
 * GET /api/ai/merchandising - Get merchandising analysis
 * 
 * Returns category performance, cross-sell patterns, and placement recommendations
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

        const analysis = await analyzeMerchandising(user.franchiseId)

        return NextResponse.json(analysis)

    } catch (error) {
        console.error('[AI_MERCHANDISING]', error)
        return NextResponse.json(
            { error: 'Failed to analyze merchandising' },
            { status: 500 }
        )
    }
}
