import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/stock-transfer — Create a new stock transfer
 * Body: { toLocationId, reason?, notes?, items: [{ itemId, itemName, itemSku?, itemBarcode?, quantitySent, unitCost? }] }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { toLocationId, reason, notes, items } = body

        if (!toLocationId || !items?.length) {
            return NextResponse.json({ error: 'toLocationId and items[] required' }, { status: 400 })
        }

        // Get user's location as source
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
        let fromLocationId = dbUser?.locationId
        if (!fromLocationId) {
            const loc = await prisma.location.findFirst({ where: { franchiseId: user.franchiseId } })
            fromLocationId = loc?.id
        }
        if (!fromLocationId) return NextResponse.json({ error: 'No source location' }, { status: 400 })
        if (fromLocationId === toLocationId) return NextResponse.json({ error: 'Cannot transfer to same location' }, { status: 400 })

        const totalItems = items.reduce((s: number, i: any) => s + i.quantitySent, 0)
        const totalValue = items.reduce((s: number, i: any) => s + (i.quantitySent * (i.unitCost || 0)), 0)

        const transfer = await prisma.inventoryTransfer.create({
            data: {
                transferNumber: `TR-${Date.now().toString(36).toUpperCase()}`,
                fromLocationId,
                toLocationId,
                status: 'PENDING',
                reason: reason || 'Stock Balance',
                notes,
                requestedById: user.id,
                requestedByName: user.name || user.email,
                totalItems,
                totalValue,
                items: {
                    create: items.map((item: any) => ({
                        itemId: item.itemId,
                        itemName: item.itemName,
                        itemSku: item.itemSku || null,
                        itemBarcode: item.itemBarcode || null,
                        quantitySent: item.quantitySent,
                        unitCost: item.unitCost || 0
                    }))
                }
            },
            include: { items: true }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'TRANSFER_CREATED', entityType: 'InventoryTransfer', entityId: transfer.id,
            details: { fromLocationId, toLocationId, totalItems, totalValue, reason }
        })

        return NextResponse.json(transfer, { status: 201 })
    } catch (error: any) {
        console.error('[STOCK_TRANSFER_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * GET /api/pos/stock-transfer?status=PENDING&locationId=xxx
 * List transfers for a location (as source or destination)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const locationId = searchParams.get('locationId')

    try {
        const where: any = {}
        if (status) where.status = status
        if (locationId) {
            where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }]
        }

        const transfers = await prisma.inventoryTransfer.findMany({
            where,
            include: {
                items: true,
                fromLocation: { select: { name: true } },
                toLocation: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json({ transfers })
    } catch (error: any) {
        console.error('[STOCK_TRANSFER_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
