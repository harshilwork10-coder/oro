'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all categories with hierarchy
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') // DEPARTMENT, SERVICE, PRODUCT, MENU, GENERAL
        const parentId = searchParams.get('parentId')
        const flat = searchParams.get('flat') === 'true' // Return flat list vs hierarchical

        const categories = await prisma.unifiedCategory.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                isActive: true,
                ...(type && { type }),
                ...(parentId !== undefined && { parentId: parentId || null })
            },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                },
                _count: {
                    select: { items: true }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ]
        })

        // If flat=true or parentId specified, return as-is
        if (flat || parentId !== undefined) {
            return NextResponse.json(categories)
        }

        // Otherwise, build hierarchy (only return top-level, with children nested)
        const topLevel = categories.filter(c => !c.parentId)
        return NextResponse.json(topLevel)

    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            name,
            description,
            color,
            icon,
            sortOrder,
            type = 'GENERAL',
            parentId
        } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // If parentId provided, verify it exists and belongs to franchise
        if (parentId) {
            const parent = await prisma.unifiedCategory.findFirst({
                where: {
                    id: parentId,
                    franchiseId: session.user.franchiseId
                }
            })
            if (!parent) {
                return NextResponse.json({ error: 'Parent category not found' }, { status: 404 })
            }
        }

        const category = await prisma.unifiedCategory.create({
            data: {
                franchiseId: session.user.franchiseId,
                name,
                description,
                color,
                icon,
                sortOrder: sortOrder || 0,
                type,
                parentId
            },
            include: {
                children: true,
                _count: { select: { items: true } }
            }
        })

        return NextResponse.json(category, { status: 201 })

    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}

// PUT - Update a category
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }

        // Verify category belongs to franchise
        const existing = await prisma.unifiedCategory.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        // Prevent circular reference
        if (updateData.parentId === id) {
            return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
        }

        const category = await prisma.unifiedCategory.update({
            where: { id },
            data: updateData,
            include: {
                children: true,
                _count: { select: { items: true } }
            }
        })

        return NextResponse.json(category)

    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

// DELETE - Delete a category (soft delete)
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }

        // Verify category belongs to franchise
        const existing = await prisma.unifiedCategory.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            },
            include: {
                _count: { select: { items: true, children: true } }
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        // Check if category has items or children
        if (existing._count.items > 0) {
            return NextResponse.json({
                error: `Cannot delete category with ${existing._count.items} items. Move or delete items first.`
            }, { status: 400 })
        }

        if (existing._count.children > 0) {
            return NextResponse.json({
                error: `Cannot delete category with ${existing._count.children} subcategories.`
            }, { status: 400 })
        }

        // Soft delete
        await prisma.unifiedCategory.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true, message: 'Category deactivated' })

    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }
}

