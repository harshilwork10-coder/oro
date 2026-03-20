// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Validate and apply coupon to transaction
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { code, cartItems } = body

        if (!code?.trim()) return ApiResponse.badRequest('Coupon code required')

        // Look up coupon in promotions (using promoCode field)
        const promo = await prisma.promotion.findFirst({
            where: {
                franchiseId: user.franchiseId,
                promoCode: code.trim().toUpperCase(),
                isActive: true
            },
            include: { qualifyingItems: true }
        })

        if (!promo) return ApiResponse.notFound('Invalid or expired coupon code')

        // Check date validity
        const now = new Date()
        if (promo.startDate && new Date(promo.startDate) > now) {
            return ApiResponse.badRequest('Coupon is not yet active')
        }
        if (promo.endDate && new Date(promo.endDate) < now) {
            return ApiResponse.badRequest('Coupon has expired')
        }

        // Check min spend
        if (promo.minSpend && cartItems) {
            const cartTotal = cartItems.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0)
            if (cartTotal < Number(promo.minSpend)) {
                return ApiResponse.badRequest(`Minimum spend of $${Number(promo.minSpend).toFixed(2)} required`)
            }
        }

        // Calculate discount
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

        return ApiResponse.success({
            valid: true,
            couponId: promo.id,
            name: promo.name,
            discountType: promo.discountType,
            discountValue: value,
            calculatedDiscount: Math.round(discount * 100) / 100,
            description: promo.description
        })
    } catch (error) {
        console.error('[COUPON_POST]', error)
        return ApiResponse.error('Failed to validate coupon')
    }
}
