import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { id } = await params

        const product = await prisma.product.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId
            },
            include: {
                productCategory: {
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true
                    }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error) {
        console.error('[PRODUCT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }
}

// PUT - Update product
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { id } = await params
        const body = await request.json()

        // Verify product belongs to franchise
        const existing = await prisma.product.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Check for duplicate barcode if changed
        if (body.barcode && body.barcode !== existing.barcode) {
            const duplicate = await prisma.product.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    barcode: body.barcode,
                    id: { not: id }
                }
            })
            if (duplicate) {
                return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
            }
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: body.name?.trim() || existing.name,
                barcode: body.barcode?.trim() || null,
                sku: body.sku?.trim() || null,
                price: body.price !== undefined ? parseFloat(body.price) : existing.price,
                cost: body.cost !== undefined ? (body.cost ? parseFloat(body.cost) : null) : existing.cost,
                stock: body.stock !== undefined ? parseInt(body.stock) : existing.stock,
                reorderPoint: body.reorderPoint !== undefined ? (body.reorderPoint ? parseInt(body.reorderPoint) : null) : existing.reorderPoint,
                categoryId: body.categoryId !== undefined ? (body.categoryId || null) : existing.categoryId,
                vendor: body.vendor !== undefined ? (body.vendor?.trim() || null) : existing.vendor,
                isActive: body.isActive !== undefined ? body.isActive : existing.isActive
            },
            include: {
                productCategory: {
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true
                    }
                }
            }
        })

        return NextResponse.json({ product })
    } catch (error) {
        console.error('[PRODUCT_PUT]', error)
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}

// DELETE - Delete product (soft delete by setting isActive = false)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { id } = await params

        // Verify product belongs to franchise
        const existing = await prisma.product.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Soft delete - just mark as inactive
        await prisma.product.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[PRODUCT_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }
}
