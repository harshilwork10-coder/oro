'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Suspend current cart (save to DB for later recall)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { cartData, label } = body

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            return ApiResponse.badRequest('Cart must have at least one item')
        }

        // Auto-expire after 24 hours
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const suspended = await (prisma as any).suspendedTransaction.create({
            data: {
                locationId,
                employeeId: user.id,
                cartData,
                label: label?.trim() || null,
                expiresAt,
                status: 'ACTIVE'
            },
            include: {
                employee: { select: { name: true } }
            }
        })

        return ApiResponse.success({ suspended })
    } catch (error) {
        console.error('[SUSPEND_POST]', error)
        return ApiResponse.error('Failed to suspend transaction')
    }
}

// GET — List all active suspended transactions for this location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        // Auto-expire old ones first
        await (prisma as any).suspendedTransaction.updateMany({
            where: {
                locationId,
                status: 'ACTIVE',
                expiresAt: { lt: new Date() }
            },
            data: { status: 'EXPIRED' }
        })

        const suspended = await (prisma as any).suspendedTransaction.findMany({
            where: {
                locationId,
                status: 'ACTIVE'
            },
            include: {
                employee: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({ suspended })
    } catch (error) {
        console.error('[SUSPEND_GET]', error)
        return ApiResponse.error('Failed to fetch suspended transactions')
    }
}

// PUT — Recall a suspended transaction (mark as RECALLED)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { id } = body

        if (!id) return ApiResponse.badRequest('Suspended transaction ID required')

        const existing = await (prisma as any).suspendedTransaction.findFirst({
            where: { id, locationId, status: 'ACTIVE' }
        })
        if (!existing) return ApiResponse.notFound('Suspended transaction not found or already recalled')

        const recalled = await (prisma as any).suspendedTransaction.update({
            where: { id },
            data: { status: 'RECALLED' }
        })

        return ApiResponse.success({ recalled, cartData: existing.cartData })
    } catch (error) {
        console.error('[SUSPEND_PUT]', error)
        return ApiResponse.error('Failed to recall transaction')
    }
}

// DELETE — Void a suspended transaction
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return ApiResponse.badRequest('ID required')

        const existing = await (prisma as any).suspendedTransaction.findFirst({
            where: { id, locationId }
        })
        if (!existing) return ApiResponse.notFound('Not found')

        await (prisma as any).suspendedTransaction.update({
            where: { id },
            data: { status: 'VOIDED' }
        })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('[SUSPEND_DELETE]', error)
        return ApiResponse.error('Failed to void')
    }
}
