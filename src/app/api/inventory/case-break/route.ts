// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Break a case into singles (or convert between pack sizes)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { caseItemId, singleItemId, caseQty, unitsPerCase } = body

        if (!caseItemId || !singleItemId || !caseQty || !unitsPerCase) {
            return ApiResponse.badRequest('caseItemId, singleItemId, caseQty, unitsPerCase required')
        }

        const caseItem = await prisma.item.findFirst({ where: { id: caseItemId, franchiseId: user.franchiseId } })
        const singleItem = await prisma.item.findFirst({ where: { id: singleItemId, franchiseId: user.franchiseId } })

        if (!caseItem || !singleItem) return ApiResponse.notFound('Item(s) not found')
        if ((caseItem.stock || 0) < caseQty) return ApiResponse.badRequest(`Only ${caseItem.stock} cases in stock`)

        const singlesAdded = caseQty * unitsPerCase

        // Deduct cases, add singles
        await prisma.$transaction([
            prisma.item.update({ where: { id: caseItemId }, data: { stock: { decrement: caseQty } } }),
            prisma.item.update({ where: { id: singleItemId }, data: { stock: { increment: singlesAdded } } }),
            prisma.stockAdjustment.create({
                data: {
                    locationId, itemId: caseItemId, quantity: -caseQty,
                    reason: 'CASE_BREAK', notes: `Broke ${caseQty} case(s) into ${singlesAdded} singles`,
                    adjustedBy: user.id
                }
            }),
            prisma.stockAdjustment.create({
                data: {
                    locationId, itemId: singleItemId, quantity: singlesAdded,
                    reason: 'CASE_BREAK', notes: `Received ${singlesAdded} singles from ${caseQty} case(s)`,
                    adjustedBy: user.id
                }
            })
        ])

        return ApiResponse.success({
            casesUsed: caseQty,
            singlesAdded,
            caseItemName: caseItem.name,
            singleItemName: singleItem.name
        })
    } catch (error) {
        console.error('[CASE_BREAK_POST]', error)
        return ApiResponse.error('Failed to break case')
    }
}
