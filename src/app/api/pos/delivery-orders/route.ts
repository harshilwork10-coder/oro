'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Create delivery/pickup order
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { type, customerName, customerPhone, customerAddress, items, scheduledTime, notes } = body as {
            type: string // PICKUP, DELIVERY
            customerName: string
            customerPhone?: string
            customerAddress?: string
            items: { itemId: string; name: string; quantity: number; price: number }[]
            scheduledTime?: string
            notes?: string
        }

        if (!type || !items?.length) return ApiResponse.badRequest('type and items required')
        if (type === 'DELIVERY' && !customerAddress) return ApiResponse.badRequest('Address required for delivery')

        const total = items.reduce((s, i) => s + (i.price * i.quantity), 0)

        const order = await prisma.transaction.create({
            data: {
                locationId,
                employeeId: user.id,
                type: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
                status: 'ORDER_PLACED',
                subtotal: total,
                total,
                paymentMethod: 'PENDING',
                notes: JSON.stringify({
                    customerName, customerPhone, customerAddress,
                    scheduledTime: scheduledTime || null,
                    notes: notes || null,
                    orderType: type,
                    statusHistory: [{ status: 'ORDER_PLACED', time: new Date(), by: user.name }]
                }),
                items: {
                    create: items.map(i => ({
                        itemId: i.itemId,
                        name: i.name,
                        quantity: i.quantity,
                        unitPrice: i.price,
                        total: i.price * i.quantity
                    }))
                }
            }
        })

        return ApiResponse.success({ order: { id: order.id, type, total: Math.round(total * 100) / 100, status: 'ORDER_PLACED' } })
    } catch (error) {
        console.error('[ORDER_POST]', error)
        return ApiResponse.error('Failed to create order')
    }
}

// GET — List pending delivery/pickup orders
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // DELIVERY, PICKUP, or null for both

        const where: any = {
            locationId,
            status: { in: ['ORDER_PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }
        }
        if (type) where.type = type

        const orders = await prisma.transaction.findMany({
            where,
            include: {
                items: { select: { name: true, quantity: true, unitPrice: true, total: true } },
                employee: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        })

        return ApiResponse.success({ orders })
    } catch (error) {
        console.error('[ORDER_GET]', error)
        return ApiResponse.error('Failed to fetch orders')
    }
}

// PUT — Update order status (PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const body = await request.json()
        const { orderId, status } = body

        if (!orderId || !status) return ApiResponse.badRequest('orderId and status required')

        const valid = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
        if (!valid.includes(status)) return ApiResponse.badRequest(`Invalid status. Use: ${valid.join(', ')}`)

        const order = await prisma.transaction.findFirst({ where: { id: orderId } })
        if (!order) return ApiResponse.notFound('Order not found')

        const orderData = JSON.parse(order.notes || '{}')
        orderData.statusHistory = orderData.statusHistory || []
        orderData.statusHistory.push({ status, time: new Date(), by: user.name })

        await prisma.transaction.update({
            where: { id: orderId },
            data: { status, notes: JSON.stringify(orderData) }
        })

        return ApiResponse.success({ orderId, status })
    } catch (error) {
        console.error('[ORDER_PUT]', error)
        return ApiResponse.error('Failed to update order')
    }
}
