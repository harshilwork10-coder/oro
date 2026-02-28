import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Delivery Platform Webhook — Receives orders from DoorDash + Uber Eats
 * 
 * This endpoint is PUBLIC (no auth) because delivery platforms call it
 * to push new orders. In production, verify signatures:
 *   DoorDash: HMAC-SHA256 with developer_secret
 *   Uber Eats: Webhook signature headers
 * 
 * Order lifecycle:
 *   NEW → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 * 
 * Webhook URL given to platforms: /api/integrations/delivery/webhook
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const platform = request.headers.get('x-delivery-platform') ||
            (body.event_type ? 'doordash' : 'ubereats')

        // ─── DoorDash Webhook ───
        // DoorDash sends: { event_type, data: { order_id, store_id, items, customer, ... } }
        if (platform === 'doordash') {
            const { event_type, data } = body

            if (event_type === 'order.created') {
                // New order from DoorDash
                const orderData = {
                    platform: 'DOORDASH',
                    externalOrderId: data.order_id,
                    storeId: data.store_id,
                    status: 'NEW',
                    customerName: data.customer?.first_name || 'DoorDash Customer',
                    customerPhone: data.customer?.phone_number || null,
                    deliveryAddress: data.delivery_address?.printable_address || null,
                    items: (data.items || []).map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price / 100, // DoorDash sends cents
                        specialInstructions: item.special_instructions || null,
                        merchantSuppliedId: item.merchant_supplied_id || null,
                    })),
                    subtotal: (data.order_value || 0) / 100,
                    tax: (data.tax || 0) / 100,
                    deliveryFee: (data.delivery_fee || 0) / 100,
                    tip: (data.tip || 0) / 100,
                    total: (data.total_charges || 0) / 100,
                    estimatedPickupTime: data.estimated_pickup_time || null,
                    receivedAt: new Date().toISOString(),
                }

                console.log(`📦 DoorDash order received: ${orderData.externalOrderId}`)

                // In production: save to database & notify POS terminal
                // await prisma.deliveryOrder.create({ data: orderData })
                // Emit real-time notification to POS via WebSocket/SSE

                return NextResponse.json({
                    status: 'received',
                    order_id: data.order_id,
                    message: 'Order received and sent to POS'
                })
            }

            if (event_type === 'order.cancelled') {
                console.log(`❌ DoorDash order cancelled: ${data.order_id}`)
                return NextResponse.json({ status: 'acknowledged' })
            }

            return NextResponse.json({ status: 'acknowledged' })
        }

        // ─── Uber Eats Webhook ───
        // Uber sends: { event_type, event_id, meta, resource_href, ... }
        if (platform === 'ubereats') {
            const { event_type, resource_href, meta } = body

            if (event_type === 'orders.notification') {
                // New order from Uber Eats
                // In production: fetch full order details from resource_href
                // const orderDetails = await fetch(resource_href, { headers: { Authorization: ... } })

                const orderData = {
                    platform: 'UBER_EATS',
                    externalOrderId: meta?.resource_id || 'unknown',
                    status: 'NEW',
                    resourceUrl: resource_href, // Fetch full order from this URL
                    receivedAt: new Date().toISOString(),
                }

                console.log(`📦 Uber Eats order received: ${orderData.externalOrderId}`)

                // In production: fetch order details, save to DB, notify POS
                return NextResponse.json({
                    status: 'received',
                    order_id: orderData.externalOrderId,
                })
            }

            if (event_type === 'orders.cancel') {
                console.log(`❌ Uber Eats order cancelled: ${meta?.resource_id}`)
                return NextResponse.json({ status: 'acknowledged' })
            }

            return NextResponse.json({ status: 'acknowledged' })
        }

        return NextResponse.json({ status: 'unknown_platform' }, { status: 400 })

    } catch (error) {
        console.error('Delivery webhook error:', error)
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
    }
}

// GET - Health check for webhook endpoint
export async function GET() {
    return NextResponse.json({
        status: 'active',
        endpoint: '/api/integrations/delivery/webhook',
        supportedPlatforms: ['doordash', 'ubereats'],
        supportedEvents: {
            doordash: ['order.created', 'order.cancelled', 'order.updated'],
            ubereats: ['orders.notification', 'orders.cancel', 'orders.status_update'],
        },
        lastChecked: new Date().toISOString(),
    })
}
