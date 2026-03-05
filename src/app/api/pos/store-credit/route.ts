// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Issue store credit (from return, goodwill, rain check)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { customerId, amount, reason, expiresInDays } = body

        if (!amount || amount <= 0) return ApiResponse.badRequest('Amount required')

        // Create a gift card as store credit
        const code = 'SC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()

        const credit = await prisma.giftCard.create({
            data: {
                franchiseId: user.franchiseId,
                code,
                initialBalance: amount,
                currentBalance: amount,
                type: 'STORE_CREDIT',
                issuedById: user.id,
                customerId: customerId || null,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
                notes: reason || 'Store credit issued',
                isActive: true
            }
        })

        return ApiResponse.success({ storeCredit: credit })
    } catch (error) {
        console.error('[STORE_CREDIT_POST]', error)
        return ApiResponse.error('Failed to issue store credit')
    }
}

// GET — Lookup store credit balance by code or customer
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const customerId = searchParams.get('customerId')

        const where: any = { franchiseId: user.franchiseId, type: 'STORE_CREDIT' }
        if (code) where.code = code
        if (customerId) where.customerId = customerId

        const credits = await prisma.giftCard.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        const totalBalance = credits.reduce((s, c) => s + Number(c.currentBalance || 0), 0)

        return ApiResponse.success({ credits, totalBalance })
    } catch (error) {
        console.error('[STORE_CREDIT_GET]', error)
        return ApiResponse.error('Failed to fetch store credits')
    }
}
