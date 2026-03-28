import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// POST - AI-powered SKU lookup for product identification
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { query, barcode, image } = await req.json()
        // TODO: Integrate with AI model for SKU identification
        console.log('[AI_SKU_LOOKUP]', { query, barcode })

        return NextResponse.json({
            results: [],
            message: 'AI SKU lookup not yet configured'
        })
    } catch (error) {
        console.error('[AI_SKU_LOOKUP]', error)
        return NextResponse.json({ error: 'Failed to perform SKU lookup' }, { status: 500 })
    }
}
