import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Create instant deal from dead stock
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            productIds,
            discountType = 'PERCENTAGE',
            discountValue,
            dealName,
            duration = 7 // Default 7 days
        } = body

        if (!productIds || productIds.length === 0) {
            return NextResponse.json({ error: 'No products selected' }, { status: 400 })
        }

        if (!discountValue || discountValue <= 0) {
            return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 400 })
        }

        // Verify products belong to this franchise
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                franchiseId: user.franchiseId
            },
            select: { id: true, name: true, price: true }
        })

        if (products.length === 0) {
            return NextResponse.json({ error: 'No valid products found' }, { status: 400 })
        }

        // Calculate end date
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + duration)

        // Create the promotion (using advanced Promotion model for customer display)
        const promotion = await prisma.promotion.create({
            data: {
                franchiseId: user.franchiseId,
                name: dealName || `Dead Stock Clearance - ${discountValue}% Off`,
                description: `Clearance deal on ${products.length} slow-moving item${products.length > 1 ? 's' : ''}`,
                type: 'PERCENTAGE',
                discountType: discountType,
                discountValue: parseFloat(discountValue.toString()),
                appliesTo: 'PRODUCTS',
                startDate: startDate,
                endDate: endDate,
                isActive: true,
                stackable: false,
                priority: 100, // High priority for clearance
                qualifyingItems: {
                    create: products.map(p => ({
                        productId: p.id
                    }))
                }
            },
            include: {
                qualifyingItems: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true }
                        }
                    }
                }
            }
        })

        // Also create simple Discount for quick POS lookup
        const discount = await prisma.discount.create({
            data: {
                franchiseId: user.franchiseId,
                name: dealName || `🔥 CLEARANCE: ${discountValue}% Off`,
                type: discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
                value: parseFloat(discountValue.toString()),
                appliesTo: 'SPECIFIC_ITEM',
                itemIds: JSON.stringify(productIds),
                startDate: startDate,
                endDate: endDate,
                isActive: true
            }
        })

        // Calculate savings for response
        const totalPotentialSavings = products.reduce((sum, p) => {
            const price = Number(p.price)
            const discountAmt = discountType === 'PERCENTAGE'
                ? price * (discountValue / 100)
                : Math.min(discountValue, price)
            return sum + discountAmt
        }, 0)

        return NextResponse.json({
            success: true,
            promotion: {
                id: promotion.id,
                name: promotion.name,
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
                startDate: promotion.startDate,
                endDate: promotion.endDate,
                productCount: products.length
            },
            discount: {
                id: discount.id,
                name: discount.name
            },
            message: `Deal created! ${products.length} products now on sale at ${discountValue}% off`,
            potentialSavings: totalPotentialSavings.toFixed(2),
            expiresIn: `${duration} days`,
            showOnCustomerDisplay: true
        })
    } catch (error) {
        console.error('Create dead stock deal error:', error)
        return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }
}

// GET - Get active dead stock deals
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ deals: [] })
        }

        // Get active promotions that were created as clearance deals
        const promotions = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                name: { contains: 'Clearance' },
                endDate: { gte: new Date() }
            },
            include: {
                qualifyingItems: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true, stock: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            deals: promotions.map(p => ({
                id: p.id,
                name: p.name,
                discountType: p.discountType,
                discountValue: Number(p.discountValue),
                startDate: p.startDate,
                endDate: p.endDate,
                productCount: p.qualifyingItems.length,
                products: p.qualifyingItems.map(qi => ({
                    id: qi.product?.id,
                    name: qi.product?.name,
                    originalPrice: Number(qi.product?.price || 0),
                    stock: qi.product?.stock || 0
                }))
            }))
        })
    } catch (error) {
        console.error('Get dead stock deals error:', error)
        return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }
}
