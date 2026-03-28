import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/inventory/purchase-orders - List all purchase orders with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const status = searchParams.get('status')
        const supplierId = searchParams.get('supplierId')
        const locationId = searchParams.get('locationId')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId
        }

        if (status && status !== 'ALL') whereClause.status = status
        if (supplierId) whereClause.supplierId = supplierId
        if (locationId) whereClause.locationId = locationId

        if (dateFrom || dateTo) {
            whereClause.createdAt = {}
            if (dateFrom) (whereClause.createdAt as Record<string, Date>).gte = new Date(dateFrom)
            if (dateTo) (whereClause.createdAt as Record<string, Date>).lte = new Date(dateTo + 'T23:59:59')
        }

        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                supplier: true,
                location: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, stock: true } }
                    }
                }
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany(
            queryArgs as Parameters<typeof prisma.purchaseOrder.findMany>[0]
        )

        const hasMore = purchaseOrders.length > (take || 50)
        const data = hasMore ? purchaseOrders.slice(0, take || 50) : purchaseOrders
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data, pagination: { nextCursor, hasMore, total: data.length } })
    } catch (error) {
        console.error('Failed to fetch purchase orders:', error)
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

// POST /api/inventory/purchase-orders - Create new purchase order
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { supplierId, locationId, expectedDate, items, status } = body

        if (!supplierId || !locationId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Supplier, location, and items are required' }, { status: 422 })
        }

        const totalCost = items.reduce((sum: number, item: { quantity: number; unitCost: number }) => {
            return sum + (item.quantity * item.unitCost)
        }, 0)

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                franchiseId: user.franchiseId,
                supplierId,
                locationId,
                status: (status === 'RECEIVED' ? 'DRAFT' : status) || 'DRAFT',
                totalCost,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                items: {
                    create: items.map((item: { productId: string; quantity: number; unitCost: number }) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        totalCost: item.quantity * item.unitCost
                    }))
                }
            },
            include: {
                supplier: true,
                items: { include: { product: true } }
            }
        })

        return NextResponse.json(purchaseOrder, { status: 201 })
    } catch (error) {
        console.error('Failed to create purchase order:', error)
        return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }
}
