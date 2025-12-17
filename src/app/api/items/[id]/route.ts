'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single item by ID
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const item = await prisma.item.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            },
            include: {
                category: true
            }
        })

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        return NextResponse.json(item)

    } catch (error) {
        console.error('Error fetching item:', error)
        return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
    }
}

// PUT - Update an item
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()

        // Verify item belongs to franchise
        const existing = await prisma.item.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Remove fields that shouldn't be updated directly
        const { franchiseId, createdAt, updatedAt, ...updateData } = body

        const item = await prisma.item.update({
            where: { id },
            data: updateData,
            include: {
                category: true
            }
        })

        return NextResponse.json(item)

    } catch (error) {
        console.error('Error updating item:', error)
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }
}

// DELETE - Delete an item (soft delete by setting isActive = false)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const { searchParams } = new URL(req.url)
        const hardDelete = searchParams.get('hard') === 'true'

        // Verify item belongs to franchise
        const existing = await prisma.item.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (hardDelete) {
            // Check if item has been used in transactions
            const usageCount = await prisma.itemLineItem.count({
                where: { itemId: id }
            })

            if (usageCount > 0) {
                return NextResponse.json({
                    error: 'Cannot delete item with transaction history. Use soft delete instead.'
                }, { status: 400 })
            }

            await prisma.item.delete({ where: { id } })
            return NextResponse.json({ success: true, message: 'Item permanently deleted' })
        } else {
            // Soft delete
            await prisma.item.update({
                where: { id },
                data: { isActive: false }
            })
            return NextResponse.json({ success: true, message: 'Item deactivated' })
        }

    } catch (error) {
        console.error('Error deleting item:', error)
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }
}

// PATCH - Partial update (for quick actions like stock update, price change)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()

        // Verify item belongs to franchise
        const existing = await prisma.item.findFirst({
            where: {
                id,
                franchiseId: session.user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Only allow specific fields to be patched
        const allowedFields = [
            'name', 'price', 'stock', 'isActive', 'sortOrder',
            'cost', 'reorderPoint', 'categoryId', 'description'
        ]

        const patchData: Record<string, any> = {}
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                patchData[key] = body[key]
            }
        }

        // Special handling for stock adjustment
        if (body.stockAdjustment !== undefined) {
            patchData.stock = (existing.stock || 0) + body.stockAdjustment
        }

        const item = await prisma.item.update({
            where: { id },
            data: patchData,
            include: {
                category: true
            }
        })

        return NextResponse.json(item)

    } catch (error) {
        console.error('Error patching item:', error)
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }
}
