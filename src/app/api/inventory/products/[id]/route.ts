import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        // Get franchise config for dual pricing settings
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: {
                franchisor: {
                    include: { config: true }
                }
            }
        })

        // Determine cash price (use cashPrice if provided, else fall back to price, else existing)
        const baseCashPrice = body.cashPrice !== undefined
            ? parseFloat(body.cashPrice)
            : body.price !== undefined
                ? parseFloat(body.price)
                : Number(existing.price)

        // Calculate card price if dual pricing is enabled
        let calculatedCardPrice: number | null = null
        const config = franchise?.franchisor?.config as any
        if (config?.pricingModel === 'DUAL_PRICING') {
            const percentage = parseFloat(String(config.cardSurcharge)) || 0
            // Formula: cardPrice = cashPrice × (1 + percentage/100)
            calculatedCardPrice = baseCashPrice * (1 + percentage / 100)
        }

        // Determine new cost value
        const newCost = body.cost !== undefined ? (body.cost ? parseFloat(body.cost) : null) : existing.cost

        // Detect price/cost changes for audit trail
        const oldPrice = Number(existing.price)
        const priceChanged = Math.abs(baseCashPrice - oldPrice) >= 0.01
        const oldCost = existing.cost ? Number(existing.cost) : null
        const costChanged = (oldCost !== null || newCost !== null) &&
            Math.abs((newCost || 0) - (oldCost || 0)) >= 0.01

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: body.name?.trim() || existing.name,
                barcode: body.barcode?.trim() || null,
                sku: body.sku?.trim() || null,
                price: baseCashPrice,
                cashPrice: baseCashPrice,
                cardPrice: calculatedCardPrice,
                cost: newCost,
                stock: body.stock !== undefined ? parseInt(body.stock) : Number(existing.stock),
                reorderPoint: body.reorderPoint !== undefined ? (body.reorderPoint ? parseInt(body.reorderPoint) : null) : existing.reorderPoint,
                categoryId: body.categoryId !== undefined ? (body.categoryId || null) : existing.categoryId,
                vendor: body.vendor !== undefined ? (body.vendor?.trim() || null) : existing.vendor,
                isActive: body.isActive !== undefined ? body.isActive : existing.isActive
            } as any,
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

        // Log price/cost change for audit trail
        if (priceChanged || costChanged) {
            await (prisma as any).priceChangeLog.create({
                data: {
                    productId: id,
                    oldPrice: oldPrice,
                    newPrice: baseCashPrice,
                    oldCost: oldCost,
                    newCost: newCost,
                    reason: 'Manual override',
                    source: 'MANUAL',
                    changedBy: user.id,
                    changedByName: user.name || user.email || null
                }
            })
        }

        // Log cost change in ProductCostHistory if cost changed
        if (costChanged && newCost !== null) {
            const changePct = oldCost && oldCost > 0
                ? ((newCost - oldCost) / oldCost * 100)
                : 0
            await (prisma as any).productCostHistory.create({
                data: {
                    productId: id,
                    oldCost: oldCost || 0,
                    newCost: newCost,
                    changePct: changePct,
                    sourceType: 'MANUAL',
                    changedBy: user.id
                }
            })
        }

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
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
