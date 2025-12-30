import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: Customer selects a tip amount (from customer display)
// No auth required - this is called from kiosk
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tipAmount, cartId } = body

        if (tipAmount === undefined) {
            return NextResponse.json({ error: 'tipAmount is required' }, { status: 400 })
        }

        // The current ActiveCart schema doesn't support tip tracking.
        // This feature requires schema updates to add tipAmount and showTipPrompt fields.
        // For now, we return success but note the tip is not persisted to ActiveCart.

        // If cartId is provided, try to find and verify the cart exists
        if (cartId) {
            const cart = await prisma.activeCart.findUnique({
                where: { id: cartId }
            })

            if (!cart) {
                return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
            }
        }

        // Log the tip selection for now (actual persistence requires schema update)
        console.log(`💵 Tip selected: $${tipAmount}${cartId ? ` for cart ${cartId}` : ''}`)

        return NextResponse.json({
            success: true,
            tipAmount,
            message: 'Tip selected successfully',
            note: 'Tip tracking requires ActiveCart schema update for full persistence'
        })
    } catch (error) {
        console.error('Error selecting tip:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

