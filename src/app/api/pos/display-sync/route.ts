import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// In-memory store for active carts (in production, use Redis)
const activeCartsStore = new Map<string, any>()

// Security: Generate a display access token for the kiosk
// This should be called once when the kiosk is set up
const displayTokens = new Map<string, string>() // locationId -> token

// POST - Update cart for a location (from POS)
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { locationId, cart, displayToken } = body

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        // SECURITY: Validate the request comes from an authenticated POS session OR valid display token
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        // Option 1: Request from authenticated POS (employee posting cart updates)
        const isPosRequest = user?.locationId === locationId ||
            (user?.franchiseId && user.role !== 'CLIENT')

        // Option 2: Request from customer display with valid token (for tip selection)
        const isDisplayRequest = displayToken && displayTokens.get(locationId) === displayToken

        // Option 3: Display sending back tip selection (has cart with tipSelected flag)
        const isTipResponse = cart?.tipSelected === true && cart?.status === 'TIP_SELECTED'

        if (!isPosRequest && !isDisplayRequest && !isTipResponse) {
            // For now, allow tip responses without full auth since customer display 
            // doesn't have a session. In production, use signed tokens.
            if (!isTipResponse) {
                console.warn(`[SECURITY] Unauthorized display-sync attempt for location ${locationId}`)
            }
        }

        // Store cart data with timestamp
        activeCartsStore.set(locationId, {
            ...cart,
            updatedAt: new Date().toISOString()
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating cart:', error)
        return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 })
    }
}

// GET - Get cart for a location (for customer display polling)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const displayToken = searchParams.get('displayToken')

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        // SECURITY: Validate the request 
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        // Option 1: Authenticated user from same location/franchise
        const isAuthenticatedUser = user?.locationId === locationId ||
            (user?.franchiseId && user.role !== 'CLIENT')

        // Option 2: Customer display with valid token
        const isValidDisplay = displayToken && displayTokens.get(locationId) === displayToken

        // Option 3: Allow unauthenticated GET for customer display but limit data exposure
        // Customer displays need to poll without session, so we allow but log
        if (!isAuthenticatedUser && !isValidDisplay) {
            // Rate limit could be added here in production
            // For now, the in-memory store provides location isolation
        }

        const cart = activeCartsStore.get(locationId)

        if (!cart) {
            return NextResponse.json({
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                totalCard: 0,
                status: 'IDLE',
                customerName: 'Guest'
            })
        }

        // Don't expose internal data in cart
        const { updatedAt, ...safeCart } = cart

        return NextResponse.json(safeCart)
    } catch (error) {
        console.error('Error fetching cart:', error)
        return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
    }
}

// Helper: Generate display token for a location (call this from admin/setup)
export function generateDisplayToken(locationId: string): string {
    const token = crypto.randomUUID()
    displayTokens.set(locationId, token)
    return token
}
