import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lookup product by barcode or SKU
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 })
        }

        // Search by barcode or SKU, include category for age restriction check
        const product = await prisma.product.findFirst({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    { barcode: code },
                    { sku: code }
                ]
            },
            select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                barcode: true,
                stock: true,
                category: true,
                ageRestricted: true,
                minimumAge: true,
                // Include category for category-level age restriction
                productCategory: {
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true,
                        isEbtEligible: true
                    }
                },
                // Include tag-along items (cross-sell suggestions)
                tagAlongParent: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    take: 5, // Limit to 5 suggestions
                    select: {
                        child: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                barcode: true,
                                sku: true
                            }
                        }
                    }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Age restriction logic:
        // 1. If PRODUCT has ageRestricted = true, use product's minimumAge
        // 2. Else if CATEGORY has ageRestricted = true, inherit from category
        // 3. Otherwise, no age restriction
        let ageRestricted = product.ageRestricted || false
        let minimumAge = product.minimumAge

        // Check category-level age restriction (inherit if product doesn't override)
        if (!ageRestricted && product.productCategory?.ageRestricted) {
            ageRestricted = true
            minimumAge = product.productCategory.minimumAge
        }

        // Extract tag-along suggestions
        const tagAlongItems = product.tagAlongParent.map(t => t.child)

        const result = {
            id: product.id,
            name: product.name,
            price: product.price,
            sku: product.sku,
            barcode: product.barcode,
            stock: product.stock,
            category: product.productCategory?.name || product.category,
            ageRestricted,
            minimumAge,
            isEbtEligible: product.productCategory?.isEbtEligible || false,
            productCategory: product.productCategory,
            tagAlongItems // Cross-sell suggestions!
        }

        // Check stock
        if (product.stock <= 0) {
            console.warn(`[RETAIL] Low stock warning: ${product.name}`)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('[RETAIL_LOOKUP]', error)
        return NextResponse.json({ error: 'Failed to lookup product' }, { status: 500 })
    }
}

