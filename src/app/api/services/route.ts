import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET: Fetch services for a location (via franchise) with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const locationId = searchParams.get('locationId')
        const search = searchParams.get('search')
        const categoryId = searchParams.get('categoryId')

        let franchiseId: string | null = null

        if (locationId) {
            // Get franchiseId from location
            const location = await prisma.location.findUnique({
                where: { id: locationId },
                select: { franchiseId: true }
            })

            if (!location) {
                return NextResponse.json({ error: 'Location' }, { status: 404 })
            }
            franchiseId = location.franchiseId
        } else {
            // If no locationId, get franchiseId from logged-in user
            if (!user?.franchiseId) {
                return NextResponse.json({ data: [], pagination: { nextCursor: null, hasMore: false, total: 0 } })
            }
            franchiseId = user.franchiseId
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: franchiseId
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

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Error fetching services:', error)
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
}
