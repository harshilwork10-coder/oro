import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch products for Pulse inventory (RETAIL only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check industry type - inventory is for RETAIL only
        const industryType = (session.user as any)?.industryType || 'SERVICE'
        if (industryType !== 'RETAIL') {
            return NextResponse.json({
                error: 'Inventory is for retail businesses only. Use /api/pulse/services for service businesses.',
                code: 'WRONG_INDUSTRY_TYPE',
                industryType
            }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const locationId = searchParams.get('locationId')

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ products: [] })
        }

        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                ...(search ? {
                    OR: [
                        { name: { contains: search } },
                        { sku: { contains: search } },
                        { barcode: { contains: search } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                cost: true,
                stock: true,
                category: true,
                productCategory: { select: { name: true } }
            },
            orderBy: { name: 'asc' },
            take: 50
        })

        return NextResponse.json({
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                barcode: p.barcode || '',
                price: Number(p.price),
                costPrice: Number(p.cost || 0),
                stock: p.stock || 0,
                location: 'Main',
                locationId: null,
                category: p.productCategory?.name || p.category || 'Uncategorized'
            }))
        })

    } catch (error) {
        console.error('Pulse inventory error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT: Update product stock/price (supports per-location updates)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { productId, price, costPrice, stock, locationIds } = body

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        // Verify user owns this product
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        const product = await prisma.product.findFirst({
            where: { id: productId, franchiseId: user.franchiseId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // If locationIds provided, update per-location pricing
        if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
            // Update or create LocationProduct for each selected location
            const updates = await Promise.all(
                locationIds.map(async (locationId: string) => {
                    return prisma.locationProduct.upsert({
                        where: {
                            locationId_productId: {
                                locationId,
                                productId
                            }
                        },
                        update: {
                            ...(price !== undefined ? { price } : {}),
                            ...(costPrice !== undefined ? { costPrice } : {}),
                            ...(stock !== undefined ? { stock } : {}),
                            updatedAt: new Date()
                        },
                        create: {
                            locationId,
                            productId,
                            price: price ?? product.price,
                            costPrice: costPrice ?? product.cost ?? 0,
                            stock: stock ?? product.stock ?? 0
                        }
                    })
                })
            )

            return NextResponse.json({
                success: true,
                updated: updates.length,
                locations: locationIds,
                message: `Updated price for ${updates.length} location(s)`
            })
        }

        // Fallback: Update franchise-wide (all locations)
        const updated = await prisma.product.update({
            where: { id: productId },
            data: {
                ...(price !== undefined ? { price } : {}),
                ...(costPrice !== undefined ? { cost: costPrice } : {}),
                ...(stock !== undefined ? { stock } : {})
            }
        })

        return NextResponse.json({ success: true, product: updated })

    } catch (error) {
        console.error('Pulse inventory update error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST: Add new product (quick add)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, price, costPrice, stock, barcode } = body

        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Name and price required' }, { status: 400 })
        }

        // Get user with role and franchise info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                franchiseId: true,
                franchisor: {
                    select: {
                        franchises: {
                            select: { id: true },
                            take: 1
                        }
                    }
                }
            }
        })

        // Provider users cannot add inventory directly
        if (user?.role === 'PROVIDER') {
            return NextResponse.json({
                error: 'Provider users cannot add inventory. Please use the admin panel.',
                code: 'PROVIDER_NOT_ALLOWED'
            }, { status: 403 })
        }

        // Determine franchiseId - either from user directly or from their franchisor's first franchise
        let franchiseId = user?.franchiseId

        if (!franchiseId && user?.franchisor?.franchises?.[0]?.id) {
            franchiseId = user.franchisor.franchises[0].id
        }

        if (!franchiseId) {
            return NextResponse.json({
                error: 'No franchise found for your account. Please contact support.',
                code: 'NO_FRANCHISE'
            }, { status: 400 })
        }

        // Create product
        const product = await prisma.product.create({
            data: {
                name,
                price,
                cost: costPrice || 0,
                stock: stock || 0,
                barcode: barcode || null,
                franchiseId,
                isActive: true
            }
        })

        return NextResponse.json({ success: true, product })

    } catch (error) {
        console.error('Pulse add product error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

