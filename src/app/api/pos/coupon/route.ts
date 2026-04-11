import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Coupon Validation — Validate and apply coupon code at POS
 * POST /api/pos/coupon
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { code, cartItems } = body

        if (!code?.trim()) return NextResponse.json({ error: 'Coupon code required' }, { status: 400 })

        const promo = await prisma.promotion.findFirst({
            where: {
                franchiseId: user.franchiseId,
                promoCode: code.trim().toUpperCase(),
                isActive: true
            },
            include: { qualifyingItems: true }
        })

        if (!promo) return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 })

        const now = new Date()
        if (promo.startDate && new Date(promo.startDate) > now) {
            return NextResponse.json({ error: 'Coupon is not yet active' }, { status: 400 })
        }
        if (promo.endDate && new Date(promo.endDate) < now) {
            return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
        }

        if (promo.minSpend && cartItems) {
            const cartTotal = cartItems.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0)
            if (cartTotal < Number(promo.minSpend)) {
                return NextResponse.json({ error: `Minimum spend of $${Number(promo.minSpend).toFixed(2)} required` }, { status: 400 })
            }
        }

        let discount = 0
        const value = Number(promo.discountValue || 0)

        if (promo.discountType === 'PERCENT') {
            const applicableTotal = cartItems
                ? cartItems.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0)
                : 0
            discount = applicableTotal * (value / 100)
        } else {
            discount = value
        }

        return NextResponse.json({
            valid: true, couponId: promo.id, name: promo.name,
            discountType: promo.discountType, discountValue: value,
            calculatedDiscount: Math.round(discount * 100) / 100,
            description: promo.description
        })
    } catch (error: any) {
        console.error('[COUPON_POST]', error)
        return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
    }
}
