import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET: Fetch services for a location (via franchise) with pagination
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const locationId = searchParams.get('locationId')
        const search = searchParams.get('search')
        const categoryId = searchParams.get('categoryId')

        if (!locationId) {
            return ApiResponse.validationError('Location ID required')
        }

        // Get franchiseId from location
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return ApiResponse.notFound('Location')
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: location.franchiseId
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { description: { contains: search } }
            ]
        }

        if (categoryId) {
            whereClause.categoryId = categoryId
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            orderBy: orderBy || { name: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const services = await prisma.service.findMany(
            queryArgs as Parameters<typeof prisma.service.findMany>[0]
        )

        const hasMore = services.length > (take || 50)
        const data = hasMore ? services.slice(0, take || 50) : services
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Error fetching services:', error)
        return ApiResponse.serverError('Failed to fetch services')
    }
}
