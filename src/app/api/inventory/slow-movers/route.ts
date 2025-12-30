import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get slow-moving products (no sales in X months)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const months = parseInt(searchParams.get('months') || '6')
        const franchiseId = searchParams.get('franchiseId') || (session.user as any).franchiseId

        if (!franchiseId) {
            return NextResponse.json({ error: 'franchiseId required' }, { status: 400 })
        }

        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - months)

        // Get all active products with stock
        const products = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                stock: { gt: 0 }
            },
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cost: true,
                stock: true,
                vendor: true,
                category: true,
                productCategory: { select: { name: true } }
            }
        })

        // For each product, check last sale date
        const slowMovers = []

        for (const product of products) {
            const lastSale = await prisma.transactionLineItem.findFirst({
                where: {
                    productId: product.id,
                    transaction: { status: 'COMPLETED' }
                },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })

            // No sale ever, or last sale before cutoff
            const isSlowMover = !lastSale || lastSale.createdAt < cutoffDate

            if (isSlowMover) {
                const tiedUpCapital = product.cost
                    ? Number(product.cost) * product.stock
                    : Number(product.price) * 0.6 * product.stock // Estimate 60% cost if unknown

                const daysSinceLastSale = lastSale
                    ? Math.ceil((Date.now() - lastSale.createdAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null

                slowMovers.push({
                    id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    sku: product.sku,
                    category: product.productCategory?.name || product.category || 'Uncategorized',
                    price: Number(product.price),
                    cost: product.cost ? Number(product.cost) : null,
                    stock: product.stock,
                    vendor: product.vendor,
                    lastSaleDate: lastSale?.createdAt || null,
                    daysSinceLastSale,
                    tiedUpCapital: Math.round(tiedUpCapital * 100) / 100,
                    suggestedDiscount: calculateSuggestedDiscount(product, daysSinceLastSale)
                })
            }
        }

        // Sort by tied-up capital (highest first)
        slowMovers.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital)

        // Calculate totals
        const totalTiedUpCapital = slowMovers.reduce((sum, p) => sum + p.tiedUpCapital, 0)
        const totalUnits = slowMovers.reduce((sum, p) => sum + p.stock, 0)

        return NextResponse.json({
            cutoffMonths: months,
            totalSlowMovers: slowMovers.length,
            totalTiedUpCapital: Math.round(totalTiedUpCapital * 100) / 100,
            totalUnits,
            products: slowMovers
        })

    } catch (error) {
        console.error('Error getting slow movers:', error)
        return NextResponse.json({ error: 'Failed to get slow movers' }, { status: 500 })
    }
}

// Calculate suggested discount based on how long item has been sitting
function calculateSuggestedDiscount(
    product: { price: any; cost: any },
    daysSinceLastSale: number | null
): { percent: number; newPrice: number; profitMargin: number } {
    const price = Number(product.price)
    const cost = product.cost ? Number(product.cost) : price * 0.6

    // More aggressive discount for longer sitting items
    let discountPercent = 10 // Base 10%

    if (daysSinceLastSale) {
        if (daysSinceLastSale > 365) discountPercent = 40
        else if (daysSinceLastSale > 270) discountPercent = 30
        else if (daysSinceLastSale > 180) discountPercent = 20
        else discountPercent = 15
    }

    // Make sure we don't go below cost
    const newPrice = price * (1 - discountPercent / 100)
    const minPrice = cost * 1.05 // At least 5% margin

    const finalPrice = Math.max(newPrice, minPrice)
    const finalDiscount = Math.round((1 - finalPrice / price) * 100)
    const profitMargin = Math.round((finalPrice - cost) / finalPrice * 100)

    return {
        percent: finalDiscount,
        newPrice: Math.round(finalPrice * 100) / 100,
        profitMargin
    }
}

