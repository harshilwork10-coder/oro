'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create customer group (Wholesale, VIP, Employee, etc.)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { name, discountPercent, description, pricingType } = body

        if (!name) return ApiResponse.badRequest('Group name required')

        // Store as a promotion with group type
        const group = await prisma.promotion.create({
            data: {
                franchiseId: user.franchiseId,
                name: `Customer Group: ${name}`,
                type: 'CUSTOMER_GROUP',
                description: description || null,
                discountType: 'PERCENT',
                discountValue: discountPercent || 0,
                isActive: true,
                appliesTo: pricingType || 'ALL', // ALL, SPECIFIC_CATEGORY
                promoCode: null
            }
        })

        return ApiResponse.success({ group })
    } catch (error) {
        console.error('[CUSTOMER_GROUP_POST]', error)
        return ApiResponse.error('Failed to create group')
    }
}

// GET — List customer groups
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const groups = await prisma.promotion.findMany({
            where: { franchiseId: user.franchiseId, type: 'CUSTOMER_GROUP', isActive: true },
            orderBy: { name: 'asc' }
        })

        return ApiResponse.success({ groups })
    } catch (error) {
        console.error('[CUSTOMER_GROUP_GET]', error)
        return ApiResponse.error('Failed to fetch groups')
    }
}
