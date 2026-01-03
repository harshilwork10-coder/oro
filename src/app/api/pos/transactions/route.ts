import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return ApiResponse.unauthorized()
    }

    try {
        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)

        // Filters
        const status = searchParams.get('status') || 'COMPLETED'
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        const employeeId = searchParams.get('employeeId')
        const locationId = searchParams.get('locationId')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: session.user.franchiseId
        }

        if (status !== 'all') {
            whereClause.status = status
        }

        if (dateFrom) {
            whereClause.createdAt = {
                ...(whereClause.createdAt as object || {}),
                gte: new Date(dateFrom)
            }
        }
        if (dateTo) {
            whereClause.createdAt = {
                ...(whereClause.createdAt as object || {}),
                lte: new Date(dateTo + 'T23:59:59')
            }
        }

        if (employeeId) whereClause.employeeId = employeeId
        if (locationId) whereClause.locationId = locationId

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                lineItems: true,
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true } }
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const transactions = await prisma.transaction.findMany(
            queryArgs as Parameters<typeof prisma.transaction.findMany>[0]
        )

        const hasMore = transactions.length > (take || 50)
        const data = hasMore ? transactions.slice(0, take || 50) : transactions
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('[POS_TRANSACTIONS_GET]', error)
        return ApiResponse.serverError('Failed to fetch transactions')
    }
}
