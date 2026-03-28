import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch the active cart for the current user (or paired user)
// Allow unauthenticated access for kiosk display
export async function GET(request: Request) {
    try {
        const authUser = await getAuthUser(request)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // For kiosk (no auth), get the most recent active cart
        if (!authUser?.email) {
            const cart = await prisma.activeCart.findFirst({
                orderBy: { updatedAt: 'desc' }
            })

            if (!cart) {
                return NextResponse.json({ empty: true, status: 'IDLE' })
            }

            return NextResponse.json({
                items: JSON.parse(cart.items),
                subtotal: Number(cart.subtotal),
                tax: Number(cart.tax),
                total: Number(cart.total),
                totalCard: Number(cart.total), // Same as cash - no surcharge
                customerName: cart.customerName,
                status: cart.status || 'ACTIVE',
                showTipPrompt: false,
                tipAmount: 0,
                tipType: 'PERCENT',
                tipSuggestions: '[15,20,25]',
                empty: false
            })
        }

        // For authenticated users, get their specific cart
        const user = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const activeCart = await prisma.activeCart.findUnique({
            where: { userId: user.id }
        })

        if (!activeCart) {
            return NextResponse.json({ empty: true, status: 'IDLE' })
        }

        return NextResponse.json({
            items: JSON.parse(activeCart.items),
            subtotal: Number(activeCart.subtotal),
            tax: Number(activeCart.tax),
            total: Number(activeCart.total),
            totalCard: Number(activeCart.total), // Same as cash - no surcharge
            customerName: activeCart.customerName,
            status: activeCart.status || 'ACTIVE',
            showTipPrompt: false,
            tipAmount: 0,
            tipType: 'PERCENT',
            tipSuggestions: '[15,20,25]',
            empty: false
        })
    } catch (error) {
        console.error('Error fetching active cart:', error)
        return NextResponse.json({ empty: true, status: 'IDLE' })
    }
}

// POST: Update the active cart
export async function POST(request: Request) {
    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: user.email }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { items, subtotal, tax, total, customerName, status, showTipPrompt, tipAmount, tipType, tipSuggestions } = body

        await prisma.activeCart.upsert({
            where: { userId: user.id },
            update: {
                items: JSON.stringify(items),
                subtotal,
                tax,
                total,
                customerName,
                status: status || 'ACTIVE'
            },
            create: {
                userId: user.id,
                items: JSON.stringify(items),
                subtotal,
                tax,
                total,
                customerName,
                status: status || 'ACTIVE'
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating active cart:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

