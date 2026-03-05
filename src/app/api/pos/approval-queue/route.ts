// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Submit void/refund/override for manager approval
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { type, transactionId, itemId, amount, reason } = body

        if (!type) return ApiResponse.badRequest('type required (VOID, REFUND, PRICE_OVERRIDE, DISCOUNT)')

        const request_ = await (prisma as any).storeException.create({
            data: {
                locationId,
                type,
                requestedBy: user.id,
                status: 'PENDING',
                data: JSON.stringify({ transactionId, itemId, amount, reason }),
                notes: reason
            }
        })

        return ApiResponse.success({ request: request_, message: 'Submitted for manager approval' })
    } catch (error) {
        console.error('[APPROVAL_QUEUE_POST]', error)
        return ApiResponse.error('Failed to submit request')
    }
}

// GET — List pending approval requests
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'PENDING'

        const requests = await (prisma as any).storeException.findMany({
            where: { locationId, status },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return ApiResponse.success({ requests })
    } catch (error) {
        console.error('[APPROVAL_QUEUE_GET]', error)
        return ApiResponse.error('Failed to fetch requests')
    }
}

// PUT — Approve or deny a request
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const body = await request.json()
        const { id, action, notes } = body

        if (!id || !action) return ApiResponse.badRequest('id and action (APPROVE/DENY) required')

        await (prisma as any).storeException.update({
            where: { id },
            data: {
                status: action === 'APPROVE' ? 'APPROVED' : 'DENIED',
                resolvedBy: user.id,
                resolvedAt: new Date(),
                notes: notes || null
            }
        })

        return ApiResponse.success({ id, status: action })
    } catch (error) {
        console.error('[APPROVAL_QUEUE_PUT]', error)
        return ApiResponse.error('Failed to process request')
    }
}
