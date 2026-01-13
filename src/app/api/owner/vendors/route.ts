import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch suppliers and purchase orders
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'all' // suppliers, orders, all
        const status = searchParams.get('status')
        const locationId = searchParams.get('locationId')

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        let response: any = {}

        // Get suppliers
        if (type === 'suppliers' || type === 'all') {
            const suppliers = await prisma.supplier.findMany({
                where: franchiseId ? { franchiseId } : {},
                select: {
                    id: true,
                    name: true,
                    contactName: true,
                    email: true,
                    phone: true,
                    address: true,
                    createdAt: true,
                    _count: { select: { purchaseOrders: true, products: true } }
                },
                orderBy: { name: 'asc' }
            })

            response.suppliers = suppliers.map(s => ({
                ...s,
                orderCount: s._count.purchaseOrders,
                productCount: s._count.products
            }))
        }

        // Get purchase orders
        if (type === 'orders' || type === 'all') {
            let orderWhere: any = {}

            if (franchiseId) orderWhere.franchiseId = franchiseId
            if (status && status !== 'all') orderWhere.status = status
            if (locationId && locationId !== 'all') orderWhere.locationId = locationId

            const orders = await prisma.purchaseOrder.findMany({
                where: orderWhere,
                include: {
                    supplier: { select: { id: true, name: true } },
                    location: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })

            response.orders = orders.map(o => ({
                id: o.id,
                status: o.status,
                totalCost: Number(o.totalCost),
                expectedDate: o.expectedDate,
                supplier: o.supplier,
                location: o.location,
                itemCount: o.items.length,
                items: o.items.map(i => ({
                    id: i.id,
                    product: i.product,
                    quantity: i.quantity,
                    unitCost: Number(i.unitCost),
                    totalCost: Number(i.totalCost)
                })),
                createdAt: o.createdAt
            }))

            // Count by status
            const counts = await prisma.purchaseOrder.groupBy({
                by: ['status'],
                where: franchiseId ? { franchiseId } : {},
                _count: true
            })

            response.orderCounts = {
                draft: counts.find(c => c.status === 'DRAFT')?._count || 0,
                ordered: counts.find(c => c.status === 'ORDERED')?._count || 0,
                received: counts.find(c => c.status === 'RECEIVED')?._count || 0,
                cancelled: counts.find(c => c.status === 'CANCELLED')?._count || 0,
                total: counts.reduce((sum, c) => sum + c._count, 0)
            }
        }

        // Get locations for filter
        if (type === 'all') {
            const locations = await prisma.location.findMany({
                where: franchiseId ? { franchiseId } : {},
                select: { id: true, name: true }
            })
            response.locations = locations
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('Vendor/PO GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Create supplier or purchase order
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { type, ...data } = body // type: 'supplier' or 'order'

        const franchiseId = user.role === 'PROVIDER' ? data.franchiseId : user.franchiseId

        if (type === 'supplier') {
            // Create new supplier
            const { name, contactName, email, phone, address } = data

            if (!name) {
                return NextResponse.json({ error: 'Supplier name required' }, { status: 400 })
            }

            const supplier = await prisma.supplier.create({
                data: {
                    franchiseId,
                    name,
                    contactName,
                    email,
                    phone,
                    address
                }
            })

            return NextResponse.json({ success: true, supplier })

        } else if (type === 'order') {
            // Create purchase order
            const { supplierId, locationId, items, expectedDate } = data

            if (!supplierId || !locationId || !items?.length) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
            }

            // Calculate total
            const totalCost = items.reduce((sum: number, item: any) => {
                return sum + (item.quantity * item.unitCost)
            }, 0)

            const order = await prisma.purchaseOrder.create({
                data: {
                    franchiseId,
                    locationId,
                    supplierId,
                    status: 'DRAFT',
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
                    location: true,
                    items: { include: { product: true } }
                }
            })

            return NextResponse.json({ success: true, order })
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (error) {
        console.error('Vendor/PO POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Update order status (order, receive, cancel)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId, action, receivedItems } = body
        // action: 'ORDER', 'RECEIVE', 'CANCEL'

        if (!orderId || !action) {
            return NextResponse.json({ error: 'Missing orderId or action' }, { status: 400 })
        }

        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                location: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Verify access
        if (user.role !== 'PROVIDER' && order.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        switch (action) {
            case 'ORDER':
                if (order.status !== 'DRAFT') {
                    return NextResponse.json({ error: 'Can only order drafts' }, { status: 400 })
                }
                await prisma.purchaseOrder.update({
                    where: { id: orderId },
                    data: { status: 'ORDERED' }
                })
                break

            case 'RECEIVE':
                if (order.status !== 'ORDERED') {
                    return NextResponse.json({ error: 'Can only receive ordered POs' }, { status: 400 })
                }

                // Add stock for received items
                // Use Item model (not Product) if that's what we need
                for (const item of order.items) {
                    // Try updating Item stock
                    try {
                        await prisma.item.updateMany({
                            where: {
                                franchiseId: order.franchiseId,
                                OR: [
                                    { id: item.productId },
                                    { sku: item.product.sku || undefined }
                                ]
                            },
                            data: {
                                stock: { increment: item.quantity }
                            }
                        })
                    } catch (e) {
                        // Debug log removed
                    }
                }

                await prisma.purchaseOrder.update({
                    where: { id: orderId },
                    data: { status: 'RECEIVED' }
                })
                break

            case 'CANCEL':
                if (order.status === 'RECEIVED') {
                    return NextResponse.json({ error: 'Cannot cancel received order' }, { status: 400 })
                }
                await prisma.purchaseOrder.update({
                    where: { id: orderId },
                    data: { status: 'CANCELLED' }
                })
                break

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Vendor/PO PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

