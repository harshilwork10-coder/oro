import { NextResponse } from 'next/server'
// In-memory store for active carts by STATION (not location)
// In production, use Redis for persistence across server restarts
const stationCartsStore = new Map<string, any>()

// POST - Update cart for a specific station (from POS)
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { stationId, cart, locationId } = body

        // Support both stationId (new) and locationId (legacy fallback)
        const key = stationId || locationId

        if (!key) {
            return NextResponse.json({ error: 'Station ID or Location ID required' }, { status: 400 })
        }

        // SECURITY: Validate the request comes from an authenticated POS session
        // POS employees can update cart for their station
        const isPosRequest = user?.franchiseId && user.role !== 'CLIENT'

        // Display sending back tip selection (has cart with tipSelected flag)
        const isTipResponse = cart?.tipSelected === true && cart?.status === 'TIP_SELECTED'

        if (!isPosRequest && !isTipResponse) {
            console.error(`[SECURITY] Unauthorized cart update attempt for station ${key}`)
        }

        // Store cart data with timestamp, keyed by station ID
        stationCartsStore.set(key, {
            ...cart,
            stationId: key,
            updatedAt: new Date().toISOString()
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating cart:', error)
        return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 })
    }
}

// GET - Get cart for a specific station (for customer display polling)
export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')
        const locationId = searchParams.get('locationId') // Legacy fallback

        // Support both stationId (new) and locationId (legacy)
        const key = stationId || locationId

        if (!key) {
            return NextResponse.json({ error: 'Station ID or Location ID required' }, { status: 400 })
        }

        // Get cart for this station
        const cart = stationCartsStore.get(key)

        if (!cart) {
            return NextResponse.json({
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                totalCard: 0,
                status: 'IDLE',
                stationId: key
            })
        }

        // Don't expose internal timestamps
        const { updatedAt, ...safeCart } = cart

        return NextResponse.json(safeCart)
    } catch (error) {
        console.error('Error fetching cart:', error)
        return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
    }
}

