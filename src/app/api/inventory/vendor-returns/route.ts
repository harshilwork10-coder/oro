// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create vendor return / RMA
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { supplierId, items, reason, notes } = body as {
            supplierId: string
            items: { itemId: string; quantity: number; reason?: string }[]
            reason: string // DAMAGED, DEFECTIVE, EXPIRED, RECALL, OVERSTOCK
            notes?: string
        }

        if (!supplierId || !items?.length || !reason) {
            return ApiResponse.badRequest('supplierId, items, and reason required')
        }

        // Create as PO with RETURN status
        const rma = await prisma.purchaseOrder.create({
            data: {
                locationId,
                supplierId,
                status: 'RETURN',
                notes: JSON.stringify({
                    reason,
                    notes: notes || null,
                    returnedBy: user.name || user.email,
                    returnDate: new Date()
                }),
                items: {
                    create: items.map(i => ({
                        itemId: i.itemId,
                        quantityOrdered: 0,
                        quantityReceived: -Math.abs(i.quantity) // Negative = going back to vendor
                    }))
                }
            },
            include: { items: { include: { item: { select: { name: true, cost: true } } } }, supplier: { select: { name: true } } }
        })

        // Deduct from inventory
        let totalCredit = 0
        for (const item of items) {
            const dbItem = await prisma.item.findFirst({ where: { id: item.itemId } })
            if (dbItem) {
                await prisma.item.update({
                    where: { id: item.itemId },
                    data: { stock: { decrement: Math.abs(item.quantity) } }
                })
                totalCredit += Math.abs(item.quantity) * Number(dbItem.cost || 0)
            }
        }

        return ApiResponse.success({
            rma,
            totalCredit: Math.round(totalCredit * 100) / 100,
            message: `Return created. Expected vendor credit: $${totalCredit.toFixed(2)}`
        })
    } catch (error) {
        console.error('[VENDOR_RETURN_POST]', error)
        return ApiResponse.error('Failed to create vendor return')
    }
}

// GET — List vendor returns
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const returns = await prisma.purchaseOrder.findMany({
            where: { locationId, status: 'RETURN' },
            include: {
                items: { include: { item: { select: { name: true, cost: true } } } },
                supplier: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return ApiResponse.success({ returns })
    } catch (error) {
        console.error('[VENDOR_RETURN_GET]', error)
        return ApiResponse.error('Failed to fetch returns')
    }
}
