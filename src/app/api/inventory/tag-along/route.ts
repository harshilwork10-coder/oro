import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get tag-along items for a product
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        const tagAlongItems = await prisma.tagAlongItem.findMany({
            where: {
                parentId: productId,
                isActive: true
            },
            orderBy: { sortOrder: 'asc' },
            include: {
                child: true
            }
        })

        return NextResponse.json({
            items: tagAlongItems.map(t => ({
                ...t.child,
                tagAlongId: t.id
            }))
        })
    } catch (error) {
        console.error('[TAG_ALONG_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch tag-along items' }, { status: 500 })
    }
}

// POST - Add tag-along item to a product
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const body = await request.json()
        const { parentId, childId } = body

        if (!parentId || !childId) {
            return NextResponse.json({ error: 'Parent and child product IDs required' }, { status: 400 })
        }

        if (parentId === childId) {
            return NextResponse.json({ error: 'Cannot add product as its own tag-along' }, { status: 400 })
        }

        // Verify both products belong to user's franchise
        const [parent, child] = await Promise.all([
            prisma.product.findFirst({ where: { id: parentId, franchiseId: user.franchiseId } }),
            prisma.product.findFirst({ where: { id: childId, franchiseId: user.franchiseId } })
        ])

        if (!parent || !child) {
            return NextResponse.json({ error: 'Products not found' }, { status: 404 })
        }

        // Get next sort order
        const maxSort = await prisma.tagAlongItem.aggregate({
            where: { parentId },
            _max: { sortOrder: true }
        })

        const tagAlong = await prisma.tagAlongItem.upsert({
            where: {
                parentId_childId: { parentId, childId }
            },
            update: { isActive: true },
            create: {
                parentId,
                childId,
                sortOrder: (maxSort._max.sortOrder || 0) + 1
            }
        })

        return NextResponse.json({ tagAlong })
    } catch (error) {
        console.error('[TAG_ALONG_POST]', error)
        return NextResponse.json({ error: 'Failed to add tag-along item' }, { status: 500 })
    }
}

// DELETE - Remove tag-along item
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { parentId, childId } = body

        if (!parentId || !childId) {
            return NextResponse.json({ error: 'Parent and child product IDs required' }, { status: 400 })
        }

        await prisma.tagAlongItem.updateMany({
            where: { parentId, childId },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[TAG_ALONG_DELETE]', error)
        return NextResponse.json({ error: 'Failed to remove tag-along item' }, { status: 500 })
    }
}
