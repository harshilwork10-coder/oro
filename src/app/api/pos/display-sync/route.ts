import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

        // Display sending back tip selection (has cart with tipSelected flag)
        const isTipResponse = cart?.tipSelected === true && cart?.status === 'TIP_SELECTED'

        if (!isTipResponse) {
            // Normal cart update from POS — log for monitoring
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
            // ═══ QR Check-In URL for SALON display idle state ═══
            // When display is idle (no active cart), include a signed check-in URL
            // so the display component can render a QR code for customers to scan.
            // Only for SALON locations — retail displays don't show check-in QR.
            let checkinUrl: string | null = null
            try {
                const loc = await prisma.location.findFirst({
                    where: stationId
                        ? { stations: { some: { id: stationId } } }
                        : { id: locationId! },
                    select: { slug: true, businessType: true }
                })
                if (loc?.slug && loc.businessType === 'SALON') {
                    const { buildCheckinUrl } = await import('@/lib/checkinToken')
                    const origin = new URL(request.url).origin
                    checkinUrl = buildCheckinUrl(loc.slug, origin)
                }
            } catch {
                // Silent — QR is an enhancement, not critical path.
                // If slug resolution fails, display falls back to phone-entry kiosk.
            }

            return NextResponse.json({
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                totalCard: 0,
                status: 'IDLE',
                stationId: key,
                checkinUrl
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
