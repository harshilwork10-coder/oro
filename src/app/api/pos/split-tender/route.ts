// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Process split tender payment (multiple payment methods on one transaction)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { transactionId, tenders } = body as {
            transactionId: string
            tenders: { method: string; amount: number; reference?: string }[]
        }

        if (!transactionId || !tenders?.length) {
            return ApiResponse.badRequest('transactionId and tenders required')
        }

        // Validate totals match
        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, locationId }
        })
        if (!tx) return ApiResponse.notFound('Transaction not found')

        const tenderTotal = tenders.reduce((s, t) => s + t.amount, 0)
        const txTotal = Number(tx.total || 0)

        if (Math.abs(tenderTotal - txTotal) > 0.01) {
            return ApiResponse.badRequest(`Tender total ($${tenderTotal.toFixed(2)}) doesn't match transaction total ($${txTotal.toFixed(2)})`)
        }

        // Record each tender as payment method metadata
        const tenderData = tenders.map(t => ({
            method: t.method.toUpperCase(), // CASH, CARD, EBT, GIFT_CARD, STORE_CREDIT
            amount: Math.round(t.amount * 100) / 100,
            reference: t.reference || null
        }))

        // Update transaction with split tender data and primary method
        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                paymentMethod: 'SPLIT',
                splitTenders: JSON.stringify(tenderData),
                status: 'COMPLETED'
            }
        })

        return ApiResponse.success({ transaction: updated, tenders: tenderData })
    } catch (error) {
        console.error('[SPLIT_TENDER_POST]', error)
        return ApiResponse.error('Failed to process split tender')
    }
}
