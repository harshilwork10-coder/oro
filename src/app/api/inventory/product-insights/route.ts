import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Get product insights (order history, sales velocity, reorder suggestion)
export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        // FIX C: Every relational query is now wrapped so products with zero
        // history (no POs, no sales) return empty data instead of crashing.

        let lastOrder: any = null
        try {
            lastOrder = await prisma.purchaseOrderItem.findFirst({
                where: { productId },
                orderBy: { purchaseOrder: { createdAt: 'desc' } },
                include: {
                    purchaseOrder: {
                        select: {
                            id: true,
                            createdAt: true,
                            status: true,
                            supplier: { select: { name: true } }
                        }
                    }
                }
            })
        } catch { /* no PO items or empty — OK */ }

        const sinceDate = lastOrder?.purchaseOrder?.createdAt
            ? new Date(lastOrder.purchaseOrder.createdAt)
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        let salesSinceOrder: any = { _sum: { quantity: 0, total: null }, _count: 0 }
        try {
            salesSinceOrder = await prisma.transactionLineItem.aggregate({
                where: {
                    productId,
                    createdAt: { gte: sinceDate },
                    transaction: { status: 'COMPLETED' }
                },
                _sum: { quantity: true, total: true },
                _count: true
            })
        } catch { /* OK */ }

        const daysSinceOrder = Math.max(1, Math.ceil(
            (Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24)
        ))
        const unitsSold = salesSinceOrder._sum?.quantity || 0
        const velocity = unitsSold / daysSinceOrder
        const daysOfStock = velocity > 0 ? Math.round(product.stock / velocity) : 999
        const targetDays = Math.min(90, Math.max(7, parseInt(searchParams.get('targetDays') || '14', 10)))
        const suggestedOrderQty = Math.max(0, Math.ceil(velocity * targetDays - product.stock))

        let allTimeSales: any = { _sum: { quantity: 0, total: null } }
        try {
            allTimeSales = await prisma.transactionLineItem.aggregate({
                where: {
                    productId,
                    transaction: { status: 'COMPLETED' }
                },
                _sum: { quantity: true, total: true }
            })
        } catch { /* OK */ }

        let lastSale: any = null
        try {
            lastSale = await prisma.transactionLineItem.findFirst({
                where: {
                    productId,
                    transaction: { status: 'COMPLETED' }
                },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
        } catch { /* OK */ }

        // Weekly sold (last 7 days)
        let weeklySales: any = { _sum: { quantity: 0 }, _count: 0 }
        try {
            weeklySales = await prisma.transactionLineItem.aggregate({
                where: {
                    productId,
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    transaction: { status: 'COMPLETED' }
                },
                _sum: { quantity: true, total: true },
                _count: true
            })
        } catch { /* OK */ }

        // Monthly sold (last 30 days)
        let monthlySales: any = { _sum: { quantity: 0 }, _count: 0 }
        try {
            monthlySales = await prisma.transactionLineItem.aggregate({
                where: {
                    productId,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    transaction: { status: 'COMPLETED' }
                },
                _sum: { quantity: true, total: true },
                _count: true
            })
        } catch { /* OK */ }

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
                date: lastOrder.purchaseOrder?.createdAt,
                quantity: lastOrder.quantity,
                unitCost: Number(lastOrder.unitCost),
                supplier: lastOrder.purchaseOrder?.supplier?.name || 'Unknown',
                daysAgo: daysSinceOrder
            } : null,
            salesSinceOrder: {
                units: unitsSold,
                revenue: salesSinceOrder._sum?.total ? Number(salesSinceOrder._sum.total) : 0,
                transactions: salesSinceOrder._count || 0
            },
            velocity: {
                unitsPerDay: Math.round(velocity * 100) / 100,
                daysOfStock,
                isLow: product.reorderPoint ? product.stock <= product.reorderPoint : false
            },
            allTimeSales: {
                units: allTimeSales._sum?.quantity || 0,
                revenue: allTimeSales._sum?.total ? Number(allTimeSales._sum.total) : 0
            },
            lastSaleDate: lastSale?.createdAt || null,
            weeklySold: {
                units: weeklySales._sum?.quantity || 0,
                revenue: weeklySales._sum?.total ? Number(weeklySales._sum.total) : 0,
                transactions: weeklySales._count || 0
            },
            monthlySold: {
                units: monthlySales._sum?.quantity || 0,
                revenue: monthlySales._sum?.total ? Number(monthlySales._sum.total) : 0,
                transactions: monthlySales._count || 0
            },
            suggestion: {
                orderQty: suggestedOrderQty,
                coversDays: targetDays,
                estimatedCost: product.cost ? suggestedOrderQty * Number(product.cost) : null
            }
        })

    } catch (error) {
        console.error('Error getting product insights:', error)
        // FIX C: Return 200 with empty data instead of 500 — the UI can still render
        return NextResponse.json({
            error: 'Failed to get insights',
            product: null, lastOrder: null,
            salesSinceOrder: { units: 0, revenue: 0, transactions: 0 },
            velocity: { unitsPerDay: 0, daysOfStock: 999, isLow: false },
            allTimeSales: { units: 0, revenue: 0 },
            lastSaleDate: null,
            weeklySold: { units: 0, revenue: 0, transactions: 0 },
            monthlySold: { units: 0, revenue: 0, transactions: 0 },
            suggestion: { orderQty: 0, coversDays: 14, estimatedCost: null }
        }, { status: 200 })
    }
}
