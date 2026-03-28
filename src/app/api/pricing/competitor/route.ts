import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch competitor pricing data
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // TODO: Integrate with competitor pricing data sources
        return NextResponse.json({
            competitors: [],
            lastUpdated: null,
            message: 'Competitor pricing integration not yet configured'
        })
    } catch (error) {
        console.error('[PRICING_COMPETITOR]', error)
        return NextResponse.json({ error: 'Failed to fetch competitor pricing' }, { status: 500 })
    }
}

// POST - Submit competitor price observation
export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        console.log('[COMPETITOR_PRICE]', body)

        return NextResponse.json({ success: true, message: 'Price observation recorded' })
    } catch (error) {
        console.error('[PRICING_COMPETITOR_POST]', error)
        return NextResponse.json({ error: 'Failed to record observation' }, { status: 500 })
    }
}
