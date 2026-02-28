'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Record consignment receipt
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { supplierId, items, terms, notes } = body as {
            supplierId: string
            items: { itemId: string; quantity: number; costPerUnit: number }[]
            terms?: string // e.g., "NET 30" or "Pay on sale"
            notes?: string
        }

        if (!supplierId || !items?.length) return ApiResponse.badRequest('supplierId and items required')

        // Create as PO with consignment type
        const po = await prisma.purchaseOrder.create({
            data: {
                locationId,
                supplierId,
                status: 'CONSIGNMENT',
                notes: JSON.stringify({ terms: terms || 'Pay on sale', notes }),
                items: {
                    create: items.map(i => ({
                        itemId: i.itemId,
                        quantityOrdered: i.quantity,
                        quantityReceived: i.quantity, // Already received
                        unitCost: i.costPerUnit
                    }))
                }
            },
            include: { items: true }
        })

        // Add stock (consigned items are in store but not paid for)
        for (const item of items) {
            await prisma.item.update({
                where: { id: item.itemId },
                data: { stock: { increment: item.quantity } }
            })
        }

        return ApiResponse.success({ consignment: po })
    } catch (error) {
        console.error('[CONSIGNMENT_POST]', error)
        return ApiResponse.error('Failed to record consignment')
    }
}

// GET — List consignment inventory (items received but not yet paid for)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const consignments = await prisma.purchaseOrder.findMany({
            where: { locationId, status: 'CONSIGNMENT' },
            include: {
                items: { include: { item: { select: { name: true, barcode: true, stock: true } } } },
                supplier: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({ consignments })
    } catch (error) {
        console.error('[CONSIGNMENT_GET]', error)
        return ApiResponse.error('Failed to fetch consignments')
    }
}
