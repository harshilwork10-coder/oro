import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get all active promotions (public endpoint for customer display)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const franchiseId = searchParams.get('franchiseId')

        const now = new Date()

        // Build where clause
        const whereClause: any = {
            isActive: true,
            OR: [
                { endDate: null },
                { endDate: { gte: now } }
            ]
        }

        // If franchiseId provided, filter by it
        if (franchiseId) {
            whereClause.franchiseId = franchiseId
        }

        // Get active promotions
        const promotions = await prisma.promotion.findMany({
            where: whereClause,
            include: {
                qualifyingItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                stock: true
                            }
                        }
                    },
                    take: 5 // Limit products for performance
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 10 // Limit to 10 deals for customer display
        })

        // Format for customer display
        const formattedPromotions = promotions.map(promo => ({
            id: promo.id,
            name: promo.name,
            description: promo.description,
            type: promo.type,
            discountType: promo.discountType,
            discountValue: Number(promo.discountValue),
            productCount: promo.qualifyingItems.length,
            products: promo.qualifyingItems
                .filter(qi => qi.product)
                .map(qi => ({
                    id: qi.product!.id,
                    name: qi.product!.name,
                    originalPrice: Number(qi.product!.price),
                    salePrice: promo.discountType === 'PERCENT'
                        ? Number(qi.product!.price) * (1 - Number(promo.discountValue) / 100)
                        : Math.max(0, Number(qi.product!.price) - Number(promo.discountValue)),
                    inStock: (qi.product!.stock || 0) > 0
                })),
            startDate: promo.startDate,
            endDate: promo.endDate,
            promoCode: promo.promoCode
        }))

        return NextResponse.json({
            promotions: formattedPromotions,
            count: formattedPromotions.length
        })
    } catch (error) {
        console.error('Error fetching active promotions:', error)
        return NextResponse.json({ promotions: [], count: 0 })
    }
}

