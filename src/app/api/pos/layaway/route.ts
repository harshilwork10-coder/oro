'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create a layaway
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { items, customerName, customerPhone, depositAmount, dueDate, notes } = body

        if (!items?.length) return ApiResponse.badRequest('Items required')
        if (!depositAmount || depositAmount <= 0) return ApiResponse.badRequest('Deposit amount required')

        const totalPrice = items.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0)
        const balance = totalPrice - depositAmount

        const layaway = await prisma.transaction.create({
            data: {
                locationId,
                employeeId: user.id,
                type: 'LAYAWAY',
                status: 'LAYAWAY_ACTIVE',
                subtotal: totalPrice,
                total: totalPrice,
                paymentMethod: 'LAYAWAY',
                notes: JSON.stringify({
                    customerName, customerPhone, depositAmount,
                    balance, dueDate, notes,
                    payments: [{ date: new Date(), amount: depositAmount, method: 'CASH' }]
                }),
                items: {
                    create: items.map((item: any) => ({
                        itemId: item.id,
                        name: item.name,
                        quantity: item.quantity || 1,
                        unitPrice: item.price,
                        total: item.price * (item.quantity || 1)
                    }))
                }
            },
            include: { items: true }
        })

        return ApiResponse.success({ layaway })
    } catch (error) {
        console.error('[LAYAWAY_POST]', error)
        return ApiResponse.error('Failed to create layaway')
    }
}

// GET — List active layaways
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const layaways = await prisma.transaction.findMany({
            where: { locationId, type: 'LAYAWAY', status: 'LAYAWAY_ACTIVE' },
            include: {
                items: true,
                employee: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return ApiResponse.success({ layaways })
    } catch (error) {
        console.error('[LAYAWAY_GET]', error)
        return ApiResponse.error('Failed to fetch layaways')
    }
}

// PUT — Make a payment on layaway or complete/cancel
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const body = await request.json()
        const { id, action, paymentAmount, paymentMethod } = body

        if (!id) return ApiResponse.badRequest('Layaway ID required')

        const layaway = await prisma.transaction.findFirst({
            where: { id, type: 'LAYAWAY' }
        })
        if (!layaway) return ApiResponse.notFound('Layaway not found')

        const data = JSON.parse(layaway.notes || '{}')

        if (action === 'PAYMENT') {
            data.payments = data.payments || []
            data.payments.push({ date: new Date(), amount: paymentAmount, method: paymentMethod || 'CASH' })
            const totalPaid = data.payments.reduce((s: number, p: any) => s + p.amount, 0)
            data.balance = Number(layaway.total) - totalPaid

            await prisma.transaction.update({
                where: { id },
                data: {
                    notes: JSON.stringify(data),
                    status: data.balance <= 0 ? 'LAYAWAY_COMPLETE' : 'LAYAWAY_ACTIVE'
                }
            })
        } else if (action === 'CANCEL') {
            await prisma.transaction.update({
                where: { id },
                data: { status: 'LAYAWAY_CANCELLED', notes: JSON.stringify(data) }
            })
        }

        return ApiResponse.success({ updated: true, balance: data.balance })
    } catch (error) {
        console.error('[LAYAWAY_PUT]', error)
        return ApiResponse.error('Failed to update layaway')
    }
}
