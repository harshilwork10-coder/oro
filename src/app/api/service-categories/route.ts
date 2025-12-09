import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all categories for the franchise
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const categories = await prisma.serviceCategory.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { sortOrder: 'asc' }
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
}

// POST - Create a new category
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const { name } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        // Get the max sortOrder to append new category at the end
        const maxCategory = await prisma.serviceCategory.findFirst({
            where: { franchiseId: user.franchiseId },
            orderBy: { sortOrder: 'desc' }
        })

        const category = await prisma.serviceCategory.create({
            data: {
                name: name.toUpperCase(),
                franchiseId: user.franchiseId,
                sortOrder: (maxCategory?.sortOrder || 0) + 1
            }
        })

        return NextResponse.json(category)
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}

// PUT - Update an existing category
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, name, sortOrder } = await request.json()

        if (!id || !name) {
            return NextResponse.json({ error: 'Category ID and name are required' }, { status: 400 })
        }

        // Security: Verify category belongs to user's franchise
        const existingCategory = await prisma.serviceCategory.findUnique({
            where: { id },
            select: { franchiseId: true }
        })

        if (!existingCategory) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        if (existingCategory.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const category = await prisma.serviceCategory.update({
            where: { id },
            data: {
                name: name.toUpperCase(),
                ...(sortOrder !== undefined && { sortOrder })
            }
        })

        return NextResponse.json(category)
    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

// DELETE - Delete a category
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }

        // Security: Verify category belongs to user's franchise
        const existingCategory = await prisma.serviceCategory.findUnique({
            where: { id },
            select: { franchiseId: true }
        })

        if (!existingCategory) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        if (existingCategory.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Check if any services are using this category
        const servicesCount = await prisma.service.count({
            where: { categoryId: id }
        })

        if (servicesCount > 0) {
            return NextResponse.json({
                error: `Cannot delete category. ${servicesCount} service(s) are using this category.`
            }, { status: 400 })
        }

        await prisma.serviceCategory.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }
}
