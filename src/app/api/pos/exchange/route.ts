// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Process an exchange (return item A, give item B, charge/refund difference)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { originalTransactionId, returnItems, newItems, reason } = body as {
            originalTransactionId: string
            returnItems: { itemId: string; quantity: number }[]
            newItems: { itemId: string; quantity: number; price: number }[]
            reason?: string
        }

        if (!returnItems?.length || !newItems?.length) {
            return ApiResponse.badRequest('returnItems and newItems required')
        }

        // Calculate return value
        const origTx = await prisma.transaction.findFirst({
            where: { id: originalTransactionId, locationId },
            include: { items: true }
        })

        let returnTotal = 0
        for (const ri of returnItems) {
            const origItem = origTx?.items.find(i => i.itemId === ri.itemId)
            if (origItem) {
                returnTotal += Number(origItem.unitPrice) * ri.quantity
            }
        }

        // Calculate new items total
        const newTotal = newItems.reduce((s, ni) => s + (ni.price * ni.quantity), 0)
        const difference = newTotal - returnTotal

        // Create exchange transaction
        const exchange = await prisma.transaction.create({
            data: {
                locationId,
                employeeId: user.id,
                type: 'EXCHANGE',
                status: 'COMPLETED',
                subtotal: newTotal,
                total: Math.abs(difference),
                paymentMethod: difference > 0 ? 'PENDING' : difference < 0 ? 'REFUND' : 'EVEN_EXCHANGE',
                notes: JSON.stringify({
                    reason: reason || 'Exchange',
                    originalTransactionId,
                    returnItems, newItems,
                    returnTotal: Math.round(returnTotal * 100) / 100,
                    newTotal: Math.round(newTotal * 100) / 100,
                    difference: Math.round(difference * 100) / 100
                }),
                items: {
                    create: [
                        ...returnItems.map(ri => ({
                            itemId: ri.itemId,
                            name: `RETURN: ${ri.itemId}`,
                            quantity: -ri.quantity,
                            unitPrice: 0,
                            total: 0
                        })),
                        ...newItems.map(ni => ({
                            itemId: ni.itemId,
                            name: `NEW: ${ni.itemId}`,
                            quantity: ni.quantity,
                            unitPrice: ni.price,
                            total: ni.price * ni.quantity
                        }))
                    ]
                }
            }
        })

        // Adjust inventory: return items back to stock, deduct new items
        for (const ri of returnItems) {
            await prisma.item.update({
                where: { id: ri.itemId },
                data: { stock: { increment: ri.quantity } }
            })
        }
        for (const ni of newItems) {
            await prisma.item.update({
                where: { id: ni.itemId },
                data: { stock: { decrement: ni.quantity } }
            })
        }

        return ApiResponse.success({
            exchangeId: exchange.id,
            returnTotal: Math.round(returnTotal * 100) / 100,
            newTotal: Math.round(newTotal * 100) / 100,
            difference: Math.round(difference * 100) / 100,
            action: difference > 0 ? `Customer owes $${difference.toFixed(2)}` : difference < 0 ? `Refund $${Math.abs(difference).toFixed(2)} to customer` : 'Even exchange — no money due'
        })
    } catch (error) {
        console.error('[EXCHANGE_POST]', error)
        return ApiResponse.error('Failed to process exchange')
    }
}
