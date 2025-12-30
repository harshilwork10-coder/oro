import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List order templates
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const templates = await prisma.orderTemplate.findMany({
            where: { franchiseId: user.franchiseId },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, barcode: true, cost: true } }
                    }
                }
            },
            orderBy: { lastUsedAt: 'desc' }
        })

        return NextResponse.json({ templates })

    } catch (error) {
        console.error('Order templates GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Create new template
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, supplierId, items, isDefault } = body

        if (!name || !items || items.length === 0) {
            return NextResponse.json({ error: 'Name and items are required' }, { status: 400 })
        }

        const template = await prisma.orderTemplate.create({
            data: {
                franchiseId: user.franchiseId,
                name,
                supplierId,
                isDefault: isDefault || false,
                items: {
                    create: items.map((item: { productId: string; defaultQty: number }) => ({
                        productId: item.productId,
                        defaultQty: item.defaultQty
                    }))
                }
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, cost: true } }
                    }
                }
            }
        })

        return NextResponse.json({ template })

    } catch (error) {
        console.error('Order templates POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Use template (create PO from template)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { templateId, locationId, adjustedItems } = body

        if (!templateId || !locationId) {
            return NextResponse.json({ error: 'Template and location are required' }, { status: 400 })
        }

        const template = await prisma.orderTemplate.findUnique({
            where: { id: templateId },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, cost: true } }
                    }
                }
            }
        })

        if (!template || template.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        // Use adjusted items or template defaults
        const orderItems = template.items.map(item => {
            const adjusted = adjustedItems?.find((a: any) => a.productId === item.productId)
            const qty = adjusted?.quantity || item.defaultQty
            const cost = Number(item.product.cost || 0)

            return {
                productId: item.productId,
                quantity: qty,
                unitCost: cost,
                totalCost: qty * cost
            }
        })

        const totalCost = orderItems.reduce((sum, item) => sum + item.totalCost, 0)

        // Create purchase order
        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                franchiseId: user.franchiseId,
                supplierId: template.supplierId || undefined,
                locationId,
                status: 'DRAFT',
                totalCost,
                items: { create: orderItems }
            },
            include: {
                supplier: true,
                items: {
                    include: { product: true }
                }
            }
        })

        // Update template last used
        await prisma.orderTemplate.update({
            where: { id: templateId },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 }
            }
        })

        return NextResponse.json({
            success: true,
            purchaseOrder,
            message: `Created PO from template "${template.name}"`
        })

    } catch (error) {
        console.error('Order templates PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE - Remove template
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const templateId = searchParams.get('id')

        if (!templateId) {
            return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
        }

        const template = await prisma.orderTemplate.findUnique({
            where: { id: templateId }
        })

        if (!template || template.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        await prisma.orderTemplate.delete({
            where: { id: templateId }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Order templates DELETE error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

