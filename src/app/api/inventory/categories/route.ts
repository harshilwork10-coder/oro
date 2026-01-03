import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET - List all product categories for franchise with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = session.user as { franchiseId?: string }
        if (!user.franchiseId) {
            return ApiResponse.error('No franchise associated', 400)
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')
        const departmentId = searchParams.get('departmentId')
        const ageRestricted = searchParams.get('ageRestricted')
        const isEbtEligible = searchParams.get('isEbtEligible')

        // Check if any categories exist, create defaults if not
        const existingCount = await prisma.productCategory.count({
            where: { franchiseId: user.franchiseId, isActive: true }
        })

        if (existingCount === 0) {
            const defaultCategories = [
                { name: 'Liquor', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 1 },
                { name: 'Beer', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 2 },
                { name: 'Wine', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 3 },
                { name: 'Tobacco', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 4 },
                { name: 'Snacks', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 5 },
                { name: 'Beverages', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 6 },
                { name: 'Candy', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 7 },
                { name: 'Grocery', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 8 },
            ]

            await prisma.productCategory.createMany({
                data: defaultCategories.map(cat => ({
                    ...cat,
                    franchiseId: user.franchiseId!,
                    isActive: true
                }))
            })
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }

        if (search) {
            whereClause.name = { contains: search }
        }

        if (departmentId) {
            whereClause.departmentId = departmentId
        }

        if (ageRestricted !== null && ageRestricted !== undefined) {
            whereClause.ageRestricted = ageRestricted === 'true'
        }

        if (isEbtEligible !== null && isEbtEligible !== undefined) {
            whereClause.isEbtEligible = isEbtEligible === 'true'
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            select: {
                id: true,
                name: true,
                description: true,
                ageRestricted: true,
                minimumAge: true,
                isEbtEligible: true,
                sortOrder: true,
                departmentId: true,
                _count: { select: { products: true } }
            },
            orderBy: orderBy || { sortOrder: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const categories = await prisma.productCategory.findMany(
            queryArgs as Parameters<typeof prisma.productCategory.findMany>[0]
        )

        const hasMore = categories.length > (take || 50)
        const data = hasMore ? categories.slice(0, take || 50) : categories
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('[CATEGORIES_GET]', error)
        return ApiResponse.serverError('Failed to fetch categories')
    }
}

// POST - Create new product category
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = session.user as { franchiseId?: string }
        if (!user.franchiseId) {
            return ApiResponse.error('No franchise associated', 400)
        }

        const body = await request.json()
        const { name, description, ageRestricted, minimumAge, departmentId, isEbtEligible } = body

        if (!name?.trim()) {
            return ApiResponse.validationError('Name is required')
        }

        const maxSort = await prisma.productCategory.aggregate({
            where: { franchiseId: user.franchiseId },
            _max: { sortOrder: true }
        })

        const category = await prisma.productCategory.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ageRestricted: ageRestricted || false,
                minimumAge: ageRestricted ? (minimumAge || 21) : null,
                isEbtEligible: isEbtEligible || false,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
                franchiseId: user.franchiseId,
                departmentId: departmentId || null
            }
        })

        return ApiResponse.created(category)
    } catch (error) {
        console.error('[CATEGORIES_POST]', error)
        return ApiResponse.serverError('Failed to create category')
    }
}
