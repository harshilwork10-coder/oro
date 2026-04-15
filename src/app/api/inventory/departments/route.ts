import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET - List all departments for franchise with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const searchParams = req.nextUrl.searchParams
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

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('[DEPARTMENTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
    }
}

// POST - Create new department
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await req.json()
        const { name, description, icon, color } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 422 })
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

        return NextResponse.json(department, { status: 201 })
    } catch (error) {
        console.error('[DEPARTMENTS_POST]', error)
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
    }
}

// DELETE - Delete department (soft delete)
export async function DELETE(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const searchParams = req.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Department ID required' }, { status: 422 })
        }

        const department = await prisma.department.findFirst({
            where: { id, franchiseId: user.franchiseId }
        })

        if (!department) {
            return NextResponse.json({ error: 'Department' }, { status: 404 })
        }

        await prisma.department.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ deleted: true })
    } catch (error) {
        console.error('[DEPARTMENTS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
    }
}
