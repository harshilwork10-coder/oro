import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const daysThreshold = parseInt(searchParams.get('days') || '90')

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ products: [], summary: { totalValue: 0, productCount: 0 } })
        }

        // Calculate the date threshold (90 days ago by default)
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

        // Get all products with stock > 0
        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                stock: { gt: 0 },
                isActive: true
            },
            select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                stock: true,
                price: true,
                cost: true,
                category: true,
                productCategory: {
                    select: { name: true }
                },
                lineItems: {
                    where: {
                        createdAt: { gte: thresholdDate }
                    },
                    select: { id: true }
                },
                updatedAt: true
            }
        })

        // Filter to only products with NO sales in the threshold period
        const deadStock = products.filter(p => p.lineItems.length === 0)

        // Get last sale date for each dead stock item
        const deadStockWithLastSale = await Promise.all(
            deadStock.map(async (product) => {
                const lastSale = await prisma.transactionLineItem.findFirst({
                    where: { productId: product.id },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                })

                const stockValue = Number(product.price) * product.stock
                const costValue = product.cost ? Number(product.cost) * product.stock : 0
                const daysSinceLastSale = lastSale
                    ? Math.floor((Date.now() - lastSale.createdAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null

                return {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode,
                    stock: product.stock,
                    price: Number(product.price),
                    cost: product.cost ? Number(product.cost) : null,
                    category: product.productCategory?.name || product.category || 'Uncategorized',
                    stockValue,
                    costValue,
                    lastSaleDate: lastSale?.createdAt || null,
                    daysSinceLastSale,
                    neverSold: !lastSale
                }
            })
        )

        // Sort by stock value (highest at risk first)
        deadStockWithLastSale.sort((a, b) => b.stockValue - a.stockValue)

        // Calculate summary
        const totalStockValue = deadStockWithLastSale.reduce((sum, p) => sum + p.stockValue, 0)
        const totalCostValue = deadStockWithLastSale.reduce((sum, p) => sum + (p.costValue || 0), 0)
        const neverSoldCount = deadStockWithLastSale.filter(p => p.neverSold).length

        return NextResponse.json({
            products: deadStockWithLastSale,
            summary: {
                productCount: deadStockWithLastSale.length,
                totalStockValue,
                totalCostValue,
                potentialLoss: totalCostValue,
                neverSoldCount,
                daysThreshold
            }
        })
    } catch (error) {
        console.error('Dead stock report error:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
