import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * Multi-Store Pricing API
 * 
 * GET  — Fetch products with per-location prices
 * POST — Update prices for selected locations only
 */

// GET — Fetch products with their price at each location
export async function GET(req: NextRequest) {
    const ROUTE_TAG = '[MULTI_STORE_PRICING_GET]'
    let step = 'init'
    try {
        step = 'auth'
        console.log(`${ROUTE_TAG} Entered route`)
        const user = await getAuthUser(req)
        console.log(`${ROUTE_TAG} Auth result:`, {
            hasUser: !!user,
            role: user?.role,
            userId: user?.id || null,
            franchiseId: user?.franchiseId || null,
        })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const categoryId = searchParams.get('categoryId') || ''
        const limit = parseInt(searchParams.get('limit') || '50')
        console.log(`${ROUTE_TAG} Query params:`, { search: search || '(none)', categoryId: categoryId || '(none)', limit })

        step = 'resolve-franchise'
        // Get franchise info
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
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

        let franchiseId = dbUser?.franchiseId
        if (!franchiseId && dbUser?.franchisor?.franchises?.[0]?.id) {
            franchiseId = dbUser.franchisor.franchises[0].id
        }

        // OWNER/FRANCHISOR fallback: if user doesn't have direct franchiseId or franchisor link,
        // try resolving via the auth user's franchiseId (which may have been resolved in getAuthUser)
        if (!franchiseId && user.franchiseId && user.franchiseId !== '__SYSTEM__') {
            franchiseId = user.franchiseId
        }

        console.log(`${ROUTE_TAG} Franchise resolution:`, {
            directFranchiseId: dbUser?.franchiseId || null,
            franchisorFranchiseId: dbUser?.franchisor?.franchises?.[0]?.id || null,
            authFranchiseId: user.franchiseId || null,
            resolved: franchiseId || null,
        })

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 400 })
        }

        step = 'query-locations'
        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true, name: true, address: true },
            orderBy: { name: 'asc' }
        })
        console.log(`${ROUTE_TAG} Found ${locations.length} locations`)

        step = 'build-product-query'
        // Build product query
        const whereClause: any = {
            franchiseId,
            isActive: true
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (categoryId) {
            whereClause.categoryId = categoryId
        }

        step = 'query-products'
        // Fetch products
        const products = await prisma.product.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cashPrice: true,
                cardPrice: true,
                cost: true,
                brand: true,
                size: true,
                productCategory: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' },
            take: limit
        })
        console.log(`${ROUTE_TAG} Found ${products.length} products`)

        step = 'query-overrides'
        // Fetch all location-specific price overrides for these products
        const productIds = products.map(p => p.id)
        const locationOverrides = productIds.length > 0 ? await prisma.locationItemOverride.findMany({
            where: {
                productId: { in: productIds },
                locationId: { in: locations.map(l => l.id) }
            }
        }) : []
        console.log(`${ROUTE_TAG} Found ${locationOverrides.length} overrides`)

        step = 'build-price-map'
        // Build a lookup map: productId -> locationId -> price data
        const priceMap = new Map<string, Map<string, { price: number }>>()
        for (const lo of locationOverrides) {
            if (!lo.productId) continue // skip non-product overrides
            if (!priceMap.has(lo.productId)) {
                priceMap.set(lo.productId, new Map())
            }
            priceMap.get(lo.productId)!.set(lo.locationId, {
                price: lo.priceOverride ? Number(lo.priceOverride) : 0
            })
        }

        step = 'serialize-response'
        // Combine into response
        const enrichedProducts = products.map(product => {
            const defaultPrice = Number(product.price)
            const locationPrices = locations.map(loc => {
                const override = priceMap.get(product.id)?.get(loc.id)
                return {
                    locationId: loc.id,
                    locationName: loc.name,
                    price: override?.price ?? defaultPrice,
                    hasOverride: !!override,
                    costPrice: Number(product.cost || 0)
                }
            })

            return {
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                sku: product.sku,
                brand: product.brand,
                size: product.size,
                defaultPrice,
                cost: Number(product.cost || 0),
                category: product.productCategory?.name || 'Uncategorized',
                categoryId: product.productCategory?.id || null,
                locationPrices
            }
        })

        step = 'query-categories'
        // Fetch categories for filter dropdown
        const categories = await prisma.productCategory.findMany({
            where: { franchiseId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        console.log(`${ROUTE_TAG} Returning ${enrichedProducts.length} products, ${locations.length} locations, ${categories.length} categories`)
        return NextResponse.json({
            products: enrichedProducts,
            locations,
            categories,
            total: enrichedProducts.length
        })

    } catch (error: any) {
        console.error(`${ROUTE_TAG} CRASH at step="${step}":`, error?.message, error?.stack)
        // FAIL-SAFE: Return structured error with diagnostic info
        return NextResponse.json({
            error: 'Failed to fetch pricing data',
            _debug: {
                step,
                message: error?.message || 'Unknown error',
                name: error?.name || 'Error',
            }
        }, { status: 500 })
    }
}

// POST — Update price at specific locations
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { updates } = body
        // updates: Array<{ productId, locationIds: string[], newPrice: number }>

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
        }

        // Get franchise info
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
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

        let franchiseId = dbUser?.franchiseId
        if (!franchiseId && dbUser?.franchisor?.franchises?.[0]?.id) {
            franchiseId = dbUser.franchisor.franchises[0].id
        }
        // OWNER/FRANCHISOR fallback
        if (!franchiseId && user.franchiseId && user.franchiseId !== '__SYSTEM__') {
            franchiseId = user.franchiseId
        }
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 400 })
        }

        let totalUpdated = 0

        for (const update of updates) {
            const { productId, locationIds, newPrice } = update

            if (!productId || !locationIds || !Array.isArray(locationIds) || newPrice === undefined) {
                continue
            }

            // Verify product belongs to this franchise
            const product = await prisma.product.findFirst({
                where: { id: productId, franchiseId }
            })

            if (!product) continue

            // Upsert LocationItemOverride for each selected location
            for (const locationId of locationIds) {
                await prisma.locationItemOverride.upsert({
                    where: {
                        locationId_productId: { locationId, productId }
                    },
                    update: {
                        priceOverride: newPrice,
                        updatedAt: new Date()
                    },
                    create: {
                        locationId,
                        productId,
                        franchiseId,
                        priceOverride: newPrice
                    }
                })
                totalUpdated++
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount: totalUpdated,
            message: `Updated pricing for ${totalUpdated} location(s)`
        })

    } catch (error) {
        console.error('[MULTI_STORE_PRICING_POST]', error)
        return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
    }
}

// DELETE — Remove location override (revert to default franchise price)
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const productId = searchParams.get('productId')
        const locationId = searchParams.get('locationId')

        if (!productId || !locationId) {
            return NextResponse.json({ error: 'productId and locationId required' }, { status: 400 })
        }

        await prisma.locationItemOverride.deleteMany({
            where: { productId, locationId }
        })

        return NextResponse.json({
            success: true,
            message: 'Price override removed — will use default franchise price'
        })

    } catch (error) {
        console.error('[MULTI_STORE_PRICING_DELETE]', error)
        return NextResponse.json({ error: 'Failed to remove override' }, { status: 500 })
    }
}
