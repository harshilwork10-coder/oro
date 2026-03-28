import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch Google Pointy integration status
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // TODO: Integrate with Google Pointy / Surfaces across Google
        return NextResponse.json({
            connected: false,
            lastSync: null,
            productsListed: 0,
            message: 'Google Pointy integration not yet configured'
        })
    } catch (error) {
        console.error('[INTEGRATIONS_GOOGLE_POINTY]', error)
        return NextResponse.json({ error: 'Failed to fetch Pointy status' }, { status: 500 })
    }
}

// POST - Update Google Pointy settings
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log('[INTEGRATIONS_GOOGLE_POINTY] Update:', body)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[INTEGRATIONS_GOOGLE_POINTY_POST]', error)
        return NextResponse.json({ error: 'Failed to update Pointy settings' }, { status: 500 })
    }
}
