import { NextRequest } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/inventory/suppliers - List all suppliers with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: session.user.franchiseId
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { contactName: { contains: search } }
            ]
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                _count: { select: { purchaseOrders: true } }
            },
            orderBy: orderBy || { name: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const suppliers = await prisma.supplier.findMany(
            queryArgs as Parameters<typeof prisma.supplier.findMany>[0]
        )

        const hasMore = suppliers.length > (take || 50)
        const data = hasMore ? suppliers.slice(0, take || 50) : suppliers
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Failed to fetch suppliers:', error)
        return ApiResponse.serverError('Failed to fetch suppliers')
    }
}

// POST /api/inventory/suppliers - Create new supplier
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await request.json()
        const { name, email, phone, contactName, address } = body

        if (!name) {
            return ApiResponse.validationError('Supplier name is required')
        }

        const supplier = await prisma.supplier.create({
            data: {
                franchiseId: session.user.franchiseId,
                name,
                email: email || null,
                phone: phone || null,
                contactName: contactName || null,
                address: address || null
            }
        })

        return ApiResponse.created(supplier)
    } catch (error) {
        console.error('Failed to create supplier:', error)
        return ApiResponse.serverError('Failed to create supplier')
    }
}
