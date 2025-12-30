import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Search products for bulk update
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const categoryId = searchParams.get('categoryId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        // Build filter
        let where: any = { isActive: true }

        if (user.role !== 'PROVIDER' && user.franchiseId) {
            where.franchiseId = user.franchiseId
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { barcode: { contains: search } },
                { sku: { contains: search } }
            ]
        }

        if (categoryId) {
            where.categoryId = categoryId
        }

        // Get products
        const [products, total] = await Promise.all([
            prisma.item.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    barcode: true,
                    sku: true,
                    price: true,
                    cost: true,
                    category: { select: { id: true, name: true } }
                },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.item.count({ where })
        ])

        // Get categories for filter dropdown
        const categories = await prisma.unifiedCategory.findMany({
            where: {
                franchiseId: user.franchiseId || undefined,
                isActive: true
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({
            products: products.map(p => ({
                ...p,
                price: Number(p.price),
                cost: p.cost ? Number(p.cost) : null,
                margin: p.cost ? ((Number(p.price) - Number(p.cost)) / Number(p.price) * 100) : null
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            categories
        })

    } catch (error) {
        console.error('Bulk pricing GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Apply bulk price changes
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { updates, mode, value, categoryId, applyToAll } = body

        // Mode: 'individual' = specific product updates
        // Mode: 'percentage' = apply % increase/decrease to selection
        // Mode: 'fixed' = set fixed markup from cost

        let updatedCount = 0

        if (mode === 'individual' && updates && Array.isArray(updates)) {
            // Individual product updates
            for (const update of updates) {
                if (!update.productId || update.newPrice === undefined) continue

                // Verify ownership
                const product = await prisma.item.findUnique({
                    where: { id: update.productId },
                    select: { franchiseId: true, price: true }
                })

                if (!product) continue
                if (user.role !== 'PROVIDER' && product.franchiseId !== user.franchiseId) continue

                // Log the price change as audit event
                try {
                    await prisma.auditEvent.create({
                        data: {
                            locationId: '', // Will need location context
                            franchiseId: product.franchiseId,
                            eventType: 'PRICE_CHANGE',
                            severity: 'LOW',
                            employeeId: user.id,
                            employeeName: user.name,
                            details: JSON.stringify({
                                productId: update.productId,
                                oldPrice: Number(product.price),
                                newPrice: update.newPrice
                            }),
                            amount: update.newPrice - Number(product.price)
                        }
                    })
                } catch (e) {
                    // Audit might fail if no location
                }

                await prisma.item.update({
                    where: { id: update.productId },
                    data: { price: update.newPrice }
                })
                updatedCount++
            }
        } else if (mode === 'percentage' && value !== undefined) {
            // Bulk percentage adjustment
            let where: any = { isActive: true }

            if (user.role !== 'PROVIDER' && user.franchiseId) {
                where.franchiseId = user.franchiseId
            }
            if (categoryId && !applyToAll) {
                where.categoryId = categoryId
            }

            const products = await prisma.item.findMany({
                where,
                select: { id: true, price: true, franchiseId: true }
            })

            for (const product of products) {
                const currentPrice = Number(product.price)
                const newPrice = currentPrice * (1 + value / 100)

                await prisma.item.update({
                    where: { id: product.id },
                    data: { price: Math.round(newPrice * 100) / 100 } // Round to 2 decimals
                })
                updatedCount++
            }
        } else if (mode === 'margin' && value !== undefined) {
            // Set prices based on cost + margin
            let where: any = { isActive: true, cost: { not: null } }

            if (user.role !== 'PROVIDER' && user.franchiseId) {
                where.franchiseId = user.franchiseId
            }
            if (categoryId && !applyToAll) {
                where.categoryId = categoryId
            }

            const products = await prisma.item.findMany({
                where,
                select: { id: true, cost: true }
            })

            for (const product of products) {
                const cost = Number(product.cost)
                const newPrice = cost / (1 - value / 100) // Margin formula

                await prisma.item.update({
                    where: { id: product.id },
                    data: { price: Math.round(newPrice * 100) / 100 }
                })
                updatedCount++
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            message: `Updated ${updatedCount} product${updatedCount !== 1 ? 's' : ''}`
        })

    } catch (error) {
        console.error('Bulk pricing POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

