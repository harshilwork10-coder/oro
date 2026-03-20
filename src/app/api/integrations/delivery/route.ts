import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch delivery integration settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        console.log('[INTEGRATIONS_DELIVERY] Update:', body)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[INTEGRATIONS_DELIVERY_POST]', error)
        return NextResponse.json({ error: 'Failed to update delivery settings' }, { status: 500 })
    }
}
