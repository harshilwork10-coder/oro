'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Log waste/damage event
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { itemId, quantity, reason, notes } = body

        if (!itemId || !quantity) return ApiResponse.badRequest('itemId and quantity required')
        if (!reason) return ApiResponse.badRequest('reason required (DAMAGED, EXPIRED, STOLEN, SPOILED, OTHER)')

        const item = await prisma.item.findFirst({
            where: { id: itemId, franchiseId: user.franchiseId }
        })
        if (!item) return ApiResponse.notFound('Item not found')

        const costLoss = Number(item.cost || 0) * quantity
        const priceLoss = Number(item.price || 0) * quantity

        // Create stock adjustment (negative)
        const adjustment = await prisma.stockAdjustment.create({
            data: {
                locationId,
                itemId,
                quantity: -Math.abs(quantity),
                reason: `WASTE: ${reason}`,
                notes: notes || null,
                adjustedBy: user.id
            }
        })

        // Deduct from stock
        await prisma.item.update({
            where: { id: itemId },
            data: { stock: { decrement: Math.abs(quantity) } }
        })

        return ApiResponse.success({
            adjustment,
            costLoss: Math.round(costLoss * 100) / 100,
            priceLoss: Math.round(priceLoss * 100) / 100
        })
    } catch (error) {
        console.error('[WASTE_POST]', error)
        return ApiResponse.error('Failed to log waste')
    }
}

// GET — Waste/damage report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')

        const since = new Date()
        since.setDate(since.getDate() - days)

        const adjustments = await prisma.stockAdjustment.findMany({
            where: {
                locationId,
                reason: { startsWith: 'WASTE:' },
                createdAt: { gte: since }
            },
            include: {
                item: { select: { name: true, barcode: true, cost: true, price: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const summary = {
            total: adjustments.length,
            totalUnits: adjustments.reduce((s, a) => s + Math.abs(a.quantity), 0),
            totalCostLoss: Math.round(adjustments.reduce((s, a) =>
                s + Math.abs(a.quantity) * Number(a.item?.cost || 0), 0) * 100) / 100,
            byReason: {} as Record<string, number>
        }

        for (const a of adjustments) {
            const reason = a.reason.replace('WASTE: ', '')
            summary.byReason[reason] = (summary.byReason[reason] || 0) + Math.abs(a.quantity)
        }

        return ApiResponse.success({ adjustments, summary, periodDays: days })
    } catch (error) {
        console.error('[WASTE_GET]', error)
        return ApiResponse.error('Failed to fetch waste report')
    }
}
