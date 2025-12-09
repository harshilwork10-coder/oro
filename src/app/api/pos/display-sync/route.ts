import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// In-memory store for active carts (in production, use Redis)
const activeCartsStore = new Map<string, any>()

// POST - Update cart for a location
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { locationId, cart } = body

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
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

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
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

        return NextResponse.json(cart)
    } catch (error) {
        console.error('Error fetching cart:', error)
        return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
    }
}
