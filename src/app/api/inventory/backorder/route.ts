import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * S8-07: Backorder Handling for PO / Receiving
 *
 * POST /api/inventory/backorder — Partially receive a PO, track remaining via audit
 * GET /api/inventory/backorder — List POs with recorded receiving events
 *
 * PurchaseOrderItem has no quantityReceived field, so receiving events
 * are tracked via AuditLog entries with action 'PO_ITEM_RECEIVED'.
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { purchaseOrderId, receivedItems } = body as {
            purchaseOrderId: string
            receivedItems: { productId: string; quantityReceived: number }[]
        }

        if (!purchaseOrderId || !receivedItems?.length) {
            return NextResponse.json({ error: 'purchaseOrderId and receivedItems required' }, { status: 400 })
        }

        const po = await prisma.purchaseOrder.findFirst({
            where: { id: purchaseOrderId, franchiseId: user.franchiseId },
            include: { items: true }
        })
        if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

        // Get previous receiving events from audit log
        const previousReceivings = await prisma.auditLog.findMany({
            where: { entityType: 'PurchaseOrder', entityId: purchaseOrderId, action: 'PO_ITEM_RECEIVED' }
        })

        // Build map of previously received quantities
        const prevReceivedMap = new Map<string, number>()
        for (const log of previousReceivings) {
            const data = log.changes ? JSON.parse(log.changes) : {}
            if (data.productId && data.quantityReceived) {
                prevReceivedMap.set(data.productId, (prevReceivedMap.get(data.productId) || 0) + data.quantityReceived)
            }
        }

        const results: any[] = []
        let allComplete = true

        for (const received of receivedItems) {
            const poItem = po.items.find((i: any) => i.productId === received.productId)
            if (!poItem) continue

            const ordered = poItem.quantity
            const previouslyReceived = prevReceivedMap.get(received.productId) || 0
            const nowReceiving = received.quantityReceived
            const totalReceived = previouslyReceived + nowReceiving
            const outstanding = Math.max(0, ordered - totalReceived)

            // Update product stock
            await prisma.product.update({
                where: { id: received.productId },
                data: { stock: { increment: nowReceiving } }
            }).catch(() => {})

            // Record receiving event
            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'PO_ITEM_RECEIVED', entityType: 'PurchaseOrder', entityId: purchaseOrderId,
                details: {
                    productId: received.productId,
                    quantityReceived: nowReceiving,
                    totalReceived, outstanding, ordered
                }
            })

            if (outstanding > 0) allComplete = false

            results.push({
                productId: received.productId,
                ordered, previouslyReceived, nowReceiving,
                totalReceived, outstanding,
                status: outstanding === 0 ? 'COMPLETE' : 'BACKORDERED'
            })
        }

        // Update PO status
        await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: allComplete ? 'RECEIVED' : 'PARTIALLY_RECEIVED' }
        })

        return NextResponse.json({
            purchaseOrderId,
            status: allComplete ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
            items: results,
            hasBackorders: !allComplete
        })
    } catch (error: any) {
        console.error('[BACKORDER_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to process' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const pos = await prisma.purchaseOrder.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: { in: ['PARTIALLY_RECEIVED', 'ORDERED', 'SENT', 'PENDING'] }
            },
            include: {
                items: { include: { product: { select: { name: true } } } },
                supplier: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        // Get all receiving events
        const receivingLogs = await prisma.auditLog.findMany({
            where: {
                franchiseId: user.franchiseId,
                entityType: 'PurchaseOrder',
                action: 'PO_ITEM_RECEIVED'
            }
        })

        // Map: poId → productId → total received
        const receivedMap = new Map<string, Map<string, number>>()
        for (const log of receivingLogs) {
            const data = log.changes ? JSON.parse(log.changes) : {}
            const poId = log.entityId || ''
            if (!receivedMap.has(poId)) receivedMap.set(poId, new Map())
            const productMap = receivedMap.get(poId)!
            productMap.set(data.productId, (productMap.get(data.productId) || 0) + (data.quantityReceived || 0))
        }

        const backorders = pos.map(po => {
            const productMap = receivedMap.get(po.id) || new Map()
            const items = po.items.map((item: any) => {
                const received = productMap.get(item.productId) || 0
                return {
                    productId: item.productId,
                    productName: item.product?.name,
                    ordered: item.quantity,
                    received,
                    outstanding: Math.max(0, item.quantity - received)
                }
            })

            return {
                poId: po.id,
                supplier: (po as any).supplier?.name,
                status: po.status,
                createdAt: po.createdAt,
                items: items.filter((i: any) => i.outstanding > 0),
                totalOutstanding: items.reduce((s: number, i: any) => s + i.outstanding, 0)
            }
        }).filter(po => po.totalOutstanding > 0)

        return NextResponse.json({
            backorders,
            totalPOs: backorders.length,
            totalOutstandingItems: backorders.reduce((s, po) => s + po.totalOutstanding, 0)
        })
    } catch (error: any) {
        console.error('[BACKORDER_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
