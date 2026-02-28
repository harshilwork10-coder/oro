'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Transaction replay: step-by-step breakdown of a transaction
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any

        const { searchParams } = new URL(request.url)
        const txId = searchParams.get('id')
        if (!txId) return ApiResponse.badRequest('Transaction ID required')

        const tx = await prisma.transaction.findFirst({
            where: { id: txId },
            include: {
                items: {
                    include: { item: { select: { name: true, barcode: true, cost: true } } }
                },
                employee: { select: { name: true, email: true } },
                location: { select: { name: true } },
                taxLines: true
            }
        })

        if (!tx) return ApiResponse.notFound('Transaction not found')

        // Build step-by-step timeline
        const timeline = []

        timeline.push({
            step: 1,
            time: tx.createdAt,
            action: 'Transaction started',
            detail: `Employee: ${tx.employee?.name || 'Unknown'} at ${tx.location?.name}`
        })

        let step = 2
        for (const item of tx.items) {
            timeline.push({
                step: step++,
                time: tx.createdAt,
                action: `Item scanned: ${item.name}`,
                detail: `Qty: ${item.quantity} × $${Number(item.unitPrice).toFixed(2)} = $${Number(item.total).toFixed(2)}`,
                barcode: item.item?.barcode,
                cost: item.item?.cost ? Number(item.item.cost) : null
            })
        }

        if (tx.discountAmount && Number(tx.discountAmount) > 0) {
            timeline.push({
                step: step++,
                time: tx.createdAt,
                action: 'Discount applied',
                detail: `-$${Number(tx.discountAmount).toFixed(2)}`
            })
        }

        timeline.push({
            step: step++,
            time: tx.createdAt,
            action: 'Tax calculated',
            detail: `Tax: $${Number(tx.taxAmount || 0).toFixed(2)}`
        })

        timeline.push({
            step: step++,
            time: tx.createdAt,
            action: `Payment: ${tx.paymentMethod}`,
            detail: `Total: $${Number(tx.total).toFixed(2)}`
        })

        if (tx.status === 'VOIDED') {
            timeline.push({
                step: step++,
                time: tx.updatedAt,
                action: '⚠️ VOIDED',
                detail: tx.notes || 'Transaction voided'
            })
        }

        if (tx.status === 'REFUNDED') {
            timeline.push({
                step: step++,
                time: tx.updatedAt,
                action: '⚠️ REFUNDED',
                detail: tx.notes || 'Transaction refunded'
            })
        }

        return ApiResponse.success({
            transaction: {
                id: tx.id,
                status: tx.status,
                total: Number(tx.total),
                paymentMethod: tx.paymentMethod,
                splitTenders: tx.splitTenders ? JSON.parse(tx.splitTenders as string) : null,
                createdAt: tx.createdAt,
                employee: tx.employee?.name,
                location: tx.location?.name
            },
            timeline,
            itemCount: tx.items.length
        })
    } catch (error) {
        console.error('[TX_REPLAY_GET]', error)
        return ApiResponse.error('Failed to replay transaction')
    }
}
