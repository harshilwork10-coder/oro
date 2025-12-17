import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/inventory/purchase-orders - List all purchase orders
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                ...(status && status !== 'ALL' ? { status } : {})
            },
            include: {
                supplier: true,
                location: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, stock: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ purchaseOrders })
    } catch (error) {
        console.error('Failed to fetch purchase orders:', error)
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

// POST /api/inventory/purchase-orders - Create new purchase order
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { supplierId, locationId, expectedDate, items, status } = await request.json()

        if (!supplierId || !locationId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Supplier, location, and items are required' }, { status: 400 })
        }

        // Calculate total cost
        const totalCost = items.reduce((sum: number, item: any) => {
            return sum + (item.quantity * item.unitCost)
        }, 0)

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                franchiseId: session.user.franchiseId,
                supplierId,
                locationId,
                status: status || 'DRAFT',
                totalCost,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        totalCost: item.quantity * item.unitCost
                    }))
                }
            },
            include: {
                supplier: true,
                items: {
                    include: { product: true }
                }
            }
        })

        return NextResponse.json({ purchaseOrder })
    } catch (error) {
        console.error('Failed to create purchase order:', error)
        return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }
}
