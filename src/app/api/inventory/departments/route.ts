import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET - List all departments for franchise with pagination
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
        const includeInactive = searchParams.get('includeInactive') === 'true'

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId
        }

        if (!includeInactive) {
            whereClause.isActive = true
        }

        if (search) {
            whereClause.name = { contains: search }
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                categories: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true,
                        _count: { select: { products: true } }
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            },
            orderBy: orderBy || { sortOrder: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const departments = await prisma.department.findMany(
            queryArgs as Parameters<typeof prisma.department.findMany>[0]
        )

        const hasMore = departments.length > (take || 50)
        const data = hasMore ? departments.slice(0, take || 50) : departments
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('[DEPARTMENTS_GET]', error)
        return ApiResponse.serverError('Failed to fetch departments')
    }
}

// POST - Create new department
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = session.user as { franchiseId?: string; role?: string; canManageInventory?: boolean }
        if (!user.franchiseId) {
            return ApiResponse.error('No franchise associated', 400)
        }

        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return ApiResponse.forbidden('Permission denied')
        }

        const body = await request.json()
        const { name, description, icon, color } = body

        if (!name?.trim()) {
            return ApiResponse.validationError('Name is required')
        }

        const maxSort = await prisma.department.aggregate({
            where: { franchiseId: user.franchiseId },
            _max: { sortOrder: true }
        })

        const department = await prisma.department.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                icon: icon || null,
                color: color || null,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
                franchiseId: user.franchiseId
            },
            include: { categories: true }
        })

        return ApiResponse.created(department)
    } catch (error) {
        console.error('[DEPARTMENTS_POST]', error)
        return ApiResponse.serverError('Failed to create department')
    }
}

// DELETE - Delete department (soft delete)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = session.user as { franchiseId?: string; role?: string; canManageInventory?: boolean }
        if (!user.franchiseId) {
            return ApiResponse.error('No franchise associated', 400)
        }

        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return ApiResponse.forbidden('Permission denied')
        }

        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return ApiResponse.validationError('Department ID required')
        }

        const department = await prisma.department.findFirst({
            where: { id, franchiseId: user.franchiseId }
        })

        if (!department) {
            return ApiResponse.notFound('Department')
        }

        await prisma.department.update({
            where: { id },
            data: { isActive: false }
        })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('[DEPARTMENTS_DELETE]', error)
        return ApiResponse.serverError('Failed to delete department')
    }
}
