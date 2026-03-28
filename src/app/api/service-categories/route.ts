import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/** Service Categories — CRUD for salon/service verticals */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { name } = await req.json()
        if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })

        const maxCategory = await prisma.serviceCategory.findFirst({ where: { franchiseId: user.franchiseId }, orderBy: { sortOrder: 'desc' } })
        const category = await prisma.serviceCategory.create({ data: { name: name.toUpperCase(), franchiseId: user.franchiseId, sortOrder: (maxCategory?.sortOrder || 0) + 1 } })
        return NextResponse.json(category)
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id, name, sortOrder } = await req.json()
        if (!id || !name) return NextResponse.json({ error: 'Category ID and name are required' }, { status: 400 })

        const existing = await prisma.serviceCategory.findUnique({ where: { id }, select: { franchiseId: true } })
        if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        if (existing.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

        const category = await prisma.serviceCategory.update({ where: { id }, data: { name: name.toUpperCase(), ...(sortOrder !== undefined && { sortOrder }) } })
        return NextResponse.json(category)
    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await req.json()
        if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

        const existing = await prisma.serviceCategory.findUnique({ where: { id }, select: { franchiseId: true } })
        if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        if (existing.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

        const servicesCount = await prisma.service.count({ where: { categoryId: id } })
        if (servicesCount > 0) return NextResponse.json({ error: `Cannot delete category. ${servicesCount} service(s) are using this category.` }, { status: 400 })

        await prisma.serviceCategory.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }
}
