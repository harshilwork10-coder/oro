'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create a pre-order / backorder
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { itemId, customerId, customerName, customerPhone, quantity, depositAmount, notes } = body

        if (!itemId || !quantity) return ApiResponse.badRequest('itemId and quantity required')

        const item = await prisma.item.findFirst({ where: { id: itemId, franchiseId: user.franchiseId } })
        if (!item) return ApiResponse.notFound('Item not found')

        // Create as a suspended transaction with pre-order type
        const preorder = await (prisma as any).suspendedTransaction.create({
            data: {
                locationId,
                cashierId: user.id,
                label: `PRE-ORDER: ${item.name} x${quantity}`,
                cartData: JSON.stringify({
                    type: 'PRE_ORDER',
                    itemId, itemName: item.name, quantity,
                    unitPrice: Number(item.price),
                    total: Number(item.price) * quantity,
                    customerId, customerName, customerPhone,
                    depositAmount: depositAmount || 0,
                    notes, status: 'WAITING'
                }),
                status: 'PRE_ORDER',
                expiresAt: new Date(Date.now() + 90 * 86400000) // 90 day expiry
            }
        })

        return ApiResponse.success({
            preorderId: preorder.id,
            itemName: item.name,
            total: Number(item.price) * quantity,
            depositPaid: depositAmount || 0,
            balanceDue: (Number(item.price) * quantity) - (depositAmount || 0)
        })
    } catch (error) {
        console.error('[PREORDER_POST]', error)
        return ApiResponse.error('Failed to create pre-order')
    }
}

// GET — List active pre-orders
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const preorders = await (prisma as any).suspendedTransaction.findMany({
            where: { locationId, status: 'PRE_ORDER' },
            orderBy: { createdAt: 'desc' }
        })

        const parsed = preorders.map((po: any) => ({
            id: po.id,
            label: po.label,
            data: JSON.parse(po.cartData || '{}'),
            createdAt: po.createdAt,
            expiresAt: po.expiresAt
        }))

        return ApiResponse.success({ preorders: parsed })
    } catch (error) {
        console.error('[PREORDER_GET]', error)
        return ApiResponse.error('Failed to fetch pre-orders')
    }
}
