// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Manager approves a price match
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const body = await request.json()
        const { itemId, competitorName, competitorPrice, proof } = body

        if (!itemId || !competitorPrice) return ApiResponse.badRequest('itemId and competitorPrice required')

        const item = await prisma.item.findFirst({
            where: { id: itemId, franchiseId: user.franchiseId }
        })
        if (!item) return ApiResponse.notFound('Item not found')

        const ourPrice = Number(item.price)
        const theirPrice = Number(competitorPrice)

        if (theirPrice >= ourPrice) {
            return ApiResponse.success({
                matched: false,
                message: `Our price ($${ourPrice.toFixed(2)}) is already lower than competitor ($${theirPrice.toFixed(2)})`
            })
        }

        const discount = ourPrice - theirPrice

        // Log as price change
        await (prisma as any).priceChangeLog.create({
            data: {
                itemId,
                oldPrice: ourPrice,
                newPrice: theirPrice,
                changedBy: user.id,
                reason: `Price Match: ${competitorName || 'Competitor'} — ${proof || 'Customer request'}`
            }
        })

        return ApiResponse.success({
            matched: true,
            itemName: item.name,
            ourPrice,
            matchedPrice: theirPrice,
            discount: Math.round(discount * 100) / 100,
            competitor: competitorName || 'Competitor',
            message: `Price matched! Apply $${discount.toFixed(2)} discount at checkout.`
        })
    } catch (error) {
        console.error('[PRICE_MATCH_POST]', error)
        return ApiResponse.error('Failed to process price match')
    }
}
