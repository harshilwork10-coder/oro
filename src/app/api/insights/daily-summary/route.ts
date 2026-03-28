import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch AI-generated daily business insights
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // TODO: Integrate with AI model for daily business insights
        return NextResponse.json({
            summary: null,
            insights: [],
            generatedAt: null,
            message: 'AI insights not yet configured'
        })
    } catch (error) {
        console.error('[INSIGHTS_DAILY]', error)
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }
}
