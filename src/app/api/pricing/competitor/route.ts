import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch competitor pricing data
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
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
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        console.log('[COMPETITOR_PRICE]', body)

        return NextResponse.json({ success: true, message: 'Price observation recorded' })
    } catch (error) {
        console.error('[PRICING_COMPETITOR_POST]', error)
        return NextResponse.json({ error: 'Failed to record observation' }, { status: 500 })
    }
}
