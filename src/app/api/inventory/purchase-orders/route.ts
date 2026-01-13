import { NextRequest } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/inventory/purchase-orders - List all purchase orders with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const status = searchParams.get('status')
        const supplierId = searchParams.get('supplierId')
        const locationId = searchParams.get('locationId')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: session.user.franchiseId
        }

        if (status && status !== 'ALL') {
            whereClause.status = status
        }

        if (supplierId) {
            whereClause.supplierId = supplierId
        }

        if (locationId) {
            whereClause.locationId = locationId
        }

        if (dateFrom || dateTo) {
            whereClause.createdAt = {}
            if (dateFrom) {
                (whereClause.createdAt as Record<string, Date>).gte = new Date(dateFrom)
            }
            if (dateTo) {
                (whereClause.createdAt as Record<string, Date>).lte = new Date(dateTo + 'T23:59:59')
            }
        }

        // Build query with pagination
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

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Failed to fetch purchase orders:', error)
        return ApiResponse.serverError('Failed to fetch purchase orders')
    }
}

// POST /api/inventory/purchase-orders - Create new purchase order
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await request.json()
        const { supplierId, locationId, expectedDate, items, status } = body

        if (!supplierId || !locationId || !items || items.length === 0) {
            return ApiResponse.validationError('Supplier, location, and items are required')
        }

        // Calculate total cost
        const totalCost = items.reduce((sum: number, item: { quantity: number; unitCost: number }) => {
            return sum + (item.quantity * item.unitCost)
        }, 0)

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                franchiseId: session.user.franchiseId,
                supplierId,
                locationId,
                status: (status === 'RECEIVED' ? 'DRAFT' : status) || 'DRAFT', // SECURITY: Prevent "RECEIVED" on create to ensure stock logic triggers via PUT
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
                items: {
                    include: { product: true }
                }
            }
        })

        return ApiResponse.created(purchaseOrder)
    } catch (error) {
        console.error('Failed to create purchase order:', error)
        return ApiResponse.serverError('Failed to create purchase order')
    }
}
