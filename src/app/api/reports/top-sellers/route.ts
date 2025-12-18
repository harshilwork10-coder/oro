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
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const limit = parseInt(searchParams.get('limit') || '20')

        const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = endDate ? new Date(endDate) : new Date()
        endDateTime.setHours(23, 59, 59, 999)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ products: [] })
        }

        // Get sales by product from transaction line items
        const productSales = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                productId: { not: null },
                transaction: {
                    franchiseId: user.franchiseId,
                    createdAt: { gte: startDateTime, lte: endDateTime },
                    status: { in: ['COMPLETED', 'APPROVED'] }
                }
            },
            _sum: { quantity: true, total: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        })

        // Get product details
        const productIds = productSales.filter(p => p.productId).map(p => p.productId as string)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, barcode: true, category: true }
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        const topSellers = productSales.map((sale, index) => {
            const product = productMap.get(sale.productId || '')
            return {
                id: sale.productId || '',
                name: product?.name || 'Unknown',
                barcode: product?.barcode || '',
                category: product?.category || '',
                quantitySold: sale._sum.quantity || 0,
                revenue: Number(sale._sum.total || 0),
                rank: index + 1
            }
        })

        return NextResponse.json({ products: topSellers })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
