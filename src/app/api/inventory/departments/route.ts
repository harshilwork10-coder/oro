import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all departments for franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const departments = await prisma.department.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true
            },
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
            orderBy: { sortOrder: 'asc' }
        })

        return NextResponse.json({ departments })
    } catch (error) {
        console.error('[DEPARTMENTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
    }
}

// POST - Create new department
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Check permission
        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const { name, description, icon, color, ageRestricted, minimumAge } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Get max sortOrder for new department
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
                ageRestricted: ageRestricted || false,
                minimumAge: ageRestricted ? (minimumAge || 21) : null,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
                franchiseId: user.franchiseId
            },
            include: {
                categories: true
            }
        })

        return NextResponse.json({ department })
    } catch (error) {
        console.error('[DEPARTMENTS_POST]', error)
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
    }
}

// DELETE - Delete department (soft delete by setting isActive = false)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Check permission
        if (user.role === 'EMPLOYEE' && !user.canManageInventory) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
        }

        // Verify department belongs to franchise
        const department = await prisma.department.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId
            }
        })

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 })
        }

        // Soft delete - set isActive to false
        await prisma.department.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DEPARTMENTS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
    }
}
