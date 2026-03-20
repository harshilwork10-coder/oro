import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch top-selling products for quick-access buttons on POS
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '6')

        // Get most frequently sold items from recent transactions
        const topItems = await prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction: {
                    franchiseId: user.franchiseId,
                    ...(user.locationId ? { locationId: user.locationId } : {}),
                    status: 'COMPLETED',
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
                },
                productId: { not: null }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        })

        const productIds = topItems
            .map(item => item.productId)
            .filter((id): id is string => id !== null)

        const products = productIds.length > 0
            ? await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    barcode: true,
                    imageUrl: true,
                    category: { select: { name: true } }
                }
            })
            : []

        // Sort by frequency and attach sold count
        const productsWithCount = productIds.map(id => {
            const product = products.find(p => p.id === id)
            const topItem = topItems.find(t => t.productId === id)
            return product ? {
                ...product,
                categoryName: product.category?.name,
                soldCount: topItem?._sum?.quantity || 0
            } : null
        }).filter(Boolean)

        return NextResponse.json({ products: productsWithCount })
    } catch (error) {
        console.error('[TOP_SELLERS]', error)
        return NextResponse.json({ products: [] })
    }
}
