'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { applyPromotions, totalPromoDiscount, type CartItem, type Promotion } from '@/lib/promo-engine'

// POST — Check which promotions apply to the current cart
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { items } = body as { items: CartItem[] }

        if (!items || items.length === 0) {
            return ApiResponse.success({ promotions: [], totalDiscount: 0 })
        }

        // Fetch all active promotions for this franchise
        const now = new Date()
        const dbPromos = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    { startDate: null },
                    { startDate: { lte: now } }
                ]
            },
            include: { qualifyingItems: true }
        })

        // Filter out expired promos
        const activePromos = dbPromos.filter(p =>
            !p.endDate || new Date(p.endDate) >= now
        )

        // Map to engine format
        const promos: Promotion[] = activePromos.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            discountType: p.discountType || 'PERCENT',
            discountValue: Number(p.discountValue || 0),
            requiredQty: p.requiredQty,
            getQty: p.getQty,
            minSpend: p.minSpend ? Number(p.minSpend) : null,
            appliesTo: p.appliesTo || 'ALL',
            stackable: p.stackable,
            priority: p.priority,
            maxUsesPerTransaction: p.maxUsesPerTransaction,
            qualifyingItems: p.qualifyingItems.map(q => ({
                categoryId: q.categoryId || undefined,
                productId: q.productId || undefined,
                isExcluded: q.isExcluded
            }))
        }))

        // Run engine
        const results = applyPromotions(items, promos)
        const discount = totalPromoDiscount(results)

        return ApiResponse.success({
            applied: results,
            totalDiscount: discount,
            promoCount: results.length
        })
    } catch (error) {
        console.error('[PROMO_CHECK_POST]', error)
        return ApiResponse.error('Failed to check promotions')
    }
}
