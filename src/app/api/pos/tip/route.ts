import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: Customer selects a tip amount (from customer display)
// No auth required - this is called from kiosk
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tipAmount } = body

        if (tipAmount === undefined) {
            return NextResponse.json({ error: 'tipAmount is required' }, { status: 400 })
        }

        // Find the most recent active cart that is awaiting tip
        const cart = await prisma.activeCart.findFirst({
            where: {
                showTipPrompt: true,
                status: 'AWAITING_TIP'
            },
            orderBy: { updatedAt: 'desc' }
        })

        if (!cart) {
            return NextResponse.json({ error: 'No cart awaiting tip selection' }, { status: 404 })
        }

        // Update the cart with the selected tip
        await prisma.activeCart.update({
            where: { id: cart.id },
            data: {
                tipAmount: tipAmount,
                showTipPrompt: false,
                status: 'TIP_SELECTED'
            } as any
        })

        return NextResponse.json({
            success: true,
            tipAmount,
            message: 'Tip selected successfully'
        })
    } catch (error) {
        console.error('Error selecting tip:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
