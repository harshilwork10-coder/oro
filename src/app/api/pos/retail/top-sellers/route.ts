import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get top-selling products for quick buttons
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '6')

        // Get top sellers by transaction count in last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const topSellers = await prisma.transactionLineItem.groupBy({
            by: ['productId'],
            where: {
                createdAt: { gte: thirtyDaysAgo },
                productId: { not: null }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        })

        // Get product details
        const productIds = topSellers
            .map(t => t.productId)
            .filter((id): id is string => id !== null)

        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
                id: true,
                name: true,
                price: true,
                barcode: true
            }
        })

        // Order by sales volume
        const orderedProducts = topSellers
            .filter(t => t.productId)
            .map(t => {
                const product = products.find(p => p.id === t.productId)
                return product ? {
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    barcode: product.barcode,
                    soldCount: t._sum?.quantity || 0
                } : null
            })
            .filter(Boolean)

        return NextResponse.json({ products: orderedProducts })

    } catch (error) {
        console.error('Error getting top sellers:', error)
        return NextResponse.json({ error: 'Failed to get top sellers' }, { status: 500 })
    }
}

