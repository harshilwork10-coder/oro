import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get product insights (order history, sales velocity, reorder suggestion)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        if (!productId) {
            return NextResponse.json({ error: 'productId required' }, { status: 400 })
        }

        // Get product with basic info
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cost: true,
                stock: true,
                vendor: true,
                reorderPoint: true,
                franchiseId: true
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Get last purchase order containing this product
        const lastOrder = await prisma.purchaseOrderItem.findFirst({
            where: { productId },
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
            include: {
                purchaseOrder: {
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                        supplier: {
                            select: { name: true }
                        }
                    }
                }
            }
        })

        // Get sales since last order (or last 90 days if no order)
        const sinceDate = lastOrder?.purchaseOrder.createdAt ||
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        const salesSinceOrder = await prisma.transactionLineItem.aggregate({
            where: {
                productId,
                createdAt: { gte: sinceDate },
                transaction: { status: 'COMPLETED' }
            },
            _sum: { quantity: true, total: true },
            _count: true
        })

        // Calculate velocity (units per day)
        const daysSinceOrder = Math.max(1, Math.ceil(
            (Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24)
        ))
        const unitsSold = salesSinceOrder._sum.quantity || 0
        const velocity = unitsSold / daysSinceOrder

        // Calculate days of stock remaining
        const daysOfStock = velocity > 0 ? Math.round(product.stock / velocity) : 999

        // AI Suggestion: order enough for ~14 days
        const targetDays = 14
        const suggestedOrderQty = Math.max(0, Math.ceil(velocity * targetDays - product.stock))

        // Get all-time sales for this product
        const allTimeSales = await prisma.transactionLineItem.aggregate({
            where: {
                productId,
                transaction: { status: 'COMPLETED' }
            },
            _sum: { quantity: true, total: true }
        })

        // Get last sale date
        const lastSale = await prisma.transactionLineItem.findFirst({
            where: {
                productId,
                transaction: { status: 'COMPLETED' }
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        })

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                sku: product.sku,
                price: Number(product.price),
                cost: product.cost ? Number(product.cost) : null,
                stock: product.stock,
                vendor: product.vendor,
                reorderPoint: product.reorderPoint
            },
            lastOrder: lastOrder ? {
                date: lastOrder.purchaseOrder.createdAt,
                quantity: lastOrder.quantity,
                unitCost: Number(lastOrder.unitCost),
                supplier: lastOrder.purchaseOrder.supplier?.name || 'Unknown',
                daysAgo: daysSinceOrder
            } : null,
            salesSinceOrder: {
                units: unitsSold,
                revenue: salesSinceOrder._sum.total ? Number(salesSinceOrder._sum.total) : 0,
                transactions: salesSinceOrder._count
            },
            velocity: {
                unitsPerDay: Math.round(velocity * 100) / 100,
                daysOfStock,
                isLow: product.reorderPoint ? product.stock <= product.reorderPoint : false
            },
            allTimeSales: {
                units: allTimeSales._sum.quantity || 0,
                revenue: allTimeSales._sum.total ? Number(allTimeSales._sum.total) : 0
            },
            lastSaleDate: lastSale?.createdAt || null,
            suggestion: {
                orderQty: suggestedOrderQty,
                coversDays: targetDays,
                estimatedCost: product.cost ? suggestedOrderQty * Number(product.cost) : null
            }
        })

    } catch (error) {
        console.error('Error getting product insights:', error)
        return NextResponse.json({ error: 'Failed to get insights' }, { status: 500 })
    }
}

