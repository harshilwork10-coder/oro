// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Issue rain check
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { itemId, customerName, customerPhone, salePrice, quantity, expiresInDays } = body

        if (!itemId || !salePrice) return ApiResponse.badRequest('itemId and salePrice required')

        const item = await prisma.item.findFirst({
            where: { id: itemId, franchiseId: user.franchiseId }
        })
        if (!item) return ApiResponse.notFound('Item not found')

        // Store as store credit / promo with metadata
        const code = 'RC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase()
        const expDays = expiresInDays || 30

        const rainCheck = await prisma.promotion.create({
            data: {
                franchiseId: user.franchiseId,
                name: `Rain Check: ${item.name}`,
                description: JSON.stringify({
                    itemId, itemName: item.name, customerName, customerPhone,
                    salePrice, quantity: quantity || 1, issuedBy: user.name || user.email
                }),
                type: 'RAIN_CHECK',
                discountType: 'FIXED',
                discountValue: Number(item.price) - salePrice,
                promoCode: code,
                startDate: new Date(),
                endDate: new Date(Date.now() + expDays * 86400000),
                maxUsesPerTransaction: 1,
                isActive: true,
                appliesTo: 'SPECIFIC_ITEM',
                qualifyingItems: {
                    create: [{ productId: itemId }]
                }
            }
        })

        return ApiResponse.success({
            rainCheck: {
                code,
                itemName: item.name,
                salePrice,
                expiresAt: rainCheck.endDate,
                id: rainCheck.id
            }
        })
    } catch (error) {
        console.error('[RAIN_CHECK_POST]', error)
        return ApiResponse.error('Failed to issue rain check')
    }
}

// GET — List active rain checks
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const rainChecks = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'RAIN_CHECK',
                isActive: true,
                endDate: { gte: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({ rainChecks })
    } catch (error) {
        console.error('[RAIN_CHECK_GET]', error)
        return ApiResponse.error('Failed to fetch rain checks')
    }
}
