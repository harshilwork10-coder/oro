import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/storefront/[slug]/products — Filtered product catalog
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { searchParams } = new URL(req.url)
        const category = searchParams.get('category')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 100)

        const location = await prisma.location.findFirst({
            where: { slug: params.slug },
            include: {
                storefrontProfile: true,
                franchise: {
                    include: {
                        franchisor: {
                            include: { config: { select: { usesStorefront: true } } }
                        }
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        const featureEnabled = location.franchise?.franchisor?.config?.usesStorefront
        if (!featureEnabled || !location.storefrontProfile?.isEnabled) {
            return NextResponse.json({ error: 'Store not available' }, { status: 404 })
        }

        const profile = location.storefrontProfile
        const franchiseId = location.franchiseId

        // Build product filter
        const where: any = {
            franchiseId,
            isActive: true,
            type: 'PRODUCT',
            price: { gt: 0 },
            // V1: Always hide age-restricted items online
            ageRestricted: false,
        }

        // Hide out-of-stock if configured
        if (profile.hideOutOfStock) {
            where.OR = [
                { stock: { gt: 0 } },
                { stock: null } // Items without stock tracking
            ]
        }

        // Category whitelist filter
        if (!profile.showAllCategories && profile.visibleCategoryIds) {
            try {
                const catIds = JSON.parse(profile.visibleCategoryIds) as string[]
                if (catIds.length > 0) {
                    where.categoryId = { in: catIds }
                }
            } catch {}
        }

        // Item blacklist filter
        if (profile.hiddenItemIds) {
            try {
                const hiddenIds = JSON.parse(profile.hiddenItemIds) as string[]
                if (hiddenIds.length > 0) {
                    where.id = { notIn: hiddenIds }
                }
            } catch {}
        }

        // Category filter from query param
        if (category) {
            where.categoryId = category
        }

        // Search filter
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { barcode: { contains: search, mode: 'insensitive' } },
                        { brand: { contains: search, mode: 'insensitive' } },
                    ]
                }
            ]
        }

        // Fetch products
        const [products, totalCount] = await Promise.all([
            prisma.item.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    brand: true,
                    size: true,
                    stock: true,
                    barcode: true,
                    categoryId: true,
                    category: { select: { id: true, name: true, color: true, icon: true } },
                },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.item.count({ where })
        ])

        // Map stock to safe status labels
        const mappedProducts = products.map(p => ({
            ...p,
            price: Number(p.price),
            stockStatus: p.stock === null ? 'IN_STOCK'
                : p.stock > 10 ? 'IN_STOCK'
                : p.stock > 0 ? 'LOW_STOCK'
                : 'OUT_OF_STOCK',
            stock: undefined, // Don't expose exact count
        }))

        // Fetch categories with product counts (for sidebar)
        const categoriesWhere: any = {
            franchiseId,
            isActive: true,
            type: { in: ['PRODUCT', 'DEPARTMENT', 'GENERAL'] },
        }

        // Apply category whitelist for sidebar too
        if (!profile.showAllCategories && profile.visibleCategoryIds) {
            try {
                const catIds = JSON.parse(profile.visibleCategoryIds) as string[]
                if (catIds.length > 0) {
                    categoriesWhere.id = { in: catIds }
                }
            } catch {}
        }

        const categories = await prisma.unifiedCategory.findMany({
            where: categoriesWhere,
            select: {
                id: true,
                name: true,
                color: true,
                icon: true,
                _count: { select: { items: true } }
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        })

        return NextResponse.json({
            products: mappedProducts,
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                color: c.color,
                icon: c.icon,
                productCount: c._count.items,
            })),
            totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit),
        })
    } catch (error) {
        console.error('[STOREFRONT_PRODUCTS_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
