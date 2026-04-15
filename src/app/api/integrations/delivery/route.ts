import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch delivery integration settings
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // TODO: Integrate with delivery platforms (DoorDash, UberEats, etc.)
        return NextResponse.json({
            enabled: false,
            platforms: [],
            message: 'Delivery integration not yet configured'
        })
    } catch (error) {
        console.error('[INTEGRATIONS_DELIVERY]', error)
        return NextResponse.json({ error: 'Failed to fetch delivery settings' }, { status: 500 })
    }
}

// POST - Update delivery integration settings
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log('[INTEGRATIONS_DELIVERY] Update:', body)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[INTEGRATIONS_DELIVERY_POST]', error)
        return NextResponse.json({ error: 'Failed to update delivery settings' }, { status: 500 })
    }
}
