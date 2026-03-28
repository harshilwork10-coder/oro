import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/pos/buydown — List active buydown promotions
 * POST /api/pos/buydown — Create a buydown (manufacturer-funded promo)
 *
 * Buydowns reduce the retail price by a manufacturer-funded amount.
 * Common in C-stores: tobacco, beverage, snack promos.
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { productId, productName, buydownAmount, manufacturer, startDate, endDate, notes } = body

        if (!productId || !buydownAmount || buydownAmount <= 0) {
            return NextResponse.json({ error: 'productId and positive buydownAmount required' }, { status: 400 })
        }

        // Store as a promotion with type BUYDOWN
        const promo = await prisma.promotion.create({
            data: {
                name: `Buydown: ${productName || 'Item'} - $${buydownAmount} off`,
                description: `Manufacturer buydown${manufacturer ? ` from ${manufacturer}` : ''}. ${notes || ''}`,
                type: 'BUYDOWN',
                discountType: 'FIXED',
                discountValue: buydownAmount,
                isActive: true,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                franchiseId: user.franchiseId,
                // Store buydown-specific metadata
                conditions: JSON.stringify({
                    productId,
                    productName,
                    manufacturer,
                    buydownAmount,
                    type: 'MANUFACTURER_BUYDOWN'
                })
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'BUYDOWN_CREATED', entityType: 'Promotion', entityId: promo.id,
            details: { productId, productName, buydownAmount, manufacturer }
        })

        return NextResponse.json(promo, { status: 201 })
    } catch (error: any) {
        console.error('[BUYDOWN_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const promos = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'BUYDOWN',
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        })

        const buydowns = promos.map(p => {
            const conditions = p.conditions ? JSON.parse(p.conditions as string) : {}
            return {
                ...p,
                productId: conditions.productId,
                productName: conditions.productName,
                manufacturer: conditions.manufacturer,
                buydownAmount: conditions.buydownAmount
            }
        })

        return NextResponse.json({ buydowns })
    } catch (error: any) {
        console.error('[BUYDOWN_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
