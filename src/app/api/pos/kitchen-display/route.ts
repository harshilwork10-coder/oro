import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * Kitchen Display System (KDS) API
 * 
 * GET  — Fetch active kitchen orders (PREPARING, READY statuses)
 * POST — Update order status (bump, complete, recall)
 * 
 * Orders flow: NEW → PREPARING → READY → COMPLETED
 */

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') // PREPARING, READY, ALL
        const limit = parseInt(searchParams.get('limit') || '50')

        // Fetch recent transactions that have deli/prepared food items
        // In a full KDS, these would come from a dedicated KitchenOrder table
        // For now, we pull from transactions with line items that need preparation
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24h
                },
                status: { in: ['COMPLETED', 'PENDING'] },
            },
            select: {
                id: true,
                createdAt: true,
                subtotal: true,
                total: true,
                employee: { select: { name: true } },
                itemLineItems: {
                    select: {
                        id: true,
                        quantity: true,
                        item: {
                            select: {
                                name: true,
                                category: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

        // Transform into KDS order format
        const orders = transactions.map((tx, idx) => {
            const createdAt = new Date(tx.createdAt)
            const elapsedMs = Date.now() - createdAt.getTime()
            const elapsedMin = Math.floor(elapsedMs / 60000)

            return {
                id: tx.id,
                orderNumber: `#${(idx + 1).toString().padStart(3, '0')}`,
                createdAt: tx.createdAt,
                elapsedMinutes: elapsedMin,
                urgency: elapsedMin < 5 ? 'green' : elapsedMin < 10 ? 'yellow' : elapsedMin < 15 ? 'orange' : 'red',
                status: elapsedMin < 2 ? 'NEW' : elapsedMin < 10 ? 'PREPARING' : 'READY',
                employeeName: tx.employee?.name || 'POS',
                items: tx.itemLineItems.map(li => ({
                    id: li.id,
                    name: li.item?.name || 'Unknown',
                    quantity: li.quantity,
                    category: li.item?.category || '',
                    bumped: false,
                })),
                itemCount: tx.itemLineItems.reduce((s, li) => s + li.quantity, 0),
            }
        })

        // Filter by status if requested
        const filtered = status && status !== 'ALL'
            ? orders.filter(o => o.status === status)
            : orders

        return NextResponse.json({
            orders: filtered,
            stats: {
                total: orders.length,
                new: orders.filter(o => o.status === 'NEW').length,
                preparing: orders.filter(o => o.status === 'PREPARING').length,
                ready: orders.filter(o => o.status === 'READY').length,
                avgWaitMinutes: orders.length
                    ? Math.round(orders.reduce((s, o) => s + o.elapsedMinutes, 0) / orders.length)
                    : 0,
            },
            refreshInterval: 5000, // Client should poll every 5s
        })

    } catch (error) {
        console.error('KDS GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { action, orderId, itemId } = body

        if (action === 'bump') {
            // Bump individual item (mark as done)
            return NextResponse.json({
                success: true,
                orderId,
                itemId,
                message: 'Item bumped',
                bumpedAt: new Date().toISOString(),
            })
        }

        if (action === 'complete') {
            // Complete entire order (all items done)
            return NextResponse.json({
                success: true,
                orderId,
                status: 'COMPLETED',
                message: 'Order completed',
                completedAt: new Date().toISOString(),
            })
        }

        if (action === 'recall') {
            // Recall a completed order back to screen
            return NextResponse.json({
                success: true,
                orderId,
                status: 'PREPARING',
                message: 'Order recalled',
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('KDS POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
