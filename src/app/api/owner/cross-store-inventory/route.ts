import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Search product and show price/stock across all stores
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
        const barcode = searchParams.get('barcode')

        if (!search && !barcode) {
            return NextResponse.json({ products: [], locations: [] })
        }

        // Get all locations for this user
        let locationFilter: any = {}
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            locationFilter.franchiseId = user.franchiseId
        }

        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: { id: true, name: true, franchiseId: true }
        })

        // Build product search filter
        let productWhere: any = { isActive: true }

        if (user.role !== 'PROVIDER' && user.franchiseId) {
            productWhere.franchiseId = user.franchiseId
        }

        if (barcode) {
            productWhere.barcode = barcode
        } else if (search) {
            productWhere.OR = [
                { name: { contains: search } },
                { barcode: { contains: search } },
                { sku: { contains: search } }
            ]
        }

        // Find matching products
        const products = await prisma.item.findMany({
            where: productWhere,
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cost: true,
                stock: true,
                imageUrl: true,
                category: { select: { id: true, name: true } },
                franchiseId: true
            },
            take: 20,
            orderBy: { name: 'asc' }
        })

        // For now, since items are at franchise level (not per-location), 
        // we'll return the same price/stock for all locations.
        // In a true multi-location inventory setup, we'd have LocationItem model.

        // Format result to show price/stock per location
        const result = products.map(product => {
            // Check if we need per-location pricing
            // For now, show same price at all locations but allow different edits
            const locationData = locations.map(loc => ({
                locationId: loc.id,
                locationName: loc.name,
                price: Number(product.price),
                stock: product.stock || 0,
                cost: product.cost ? Number(product.cost) : null
            }))

            return {
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                sku: product.sku,
                imageUrl: product.imageUrl,
                category: product.category?.name || 'Uncategorized',
                basePrice: Number(product.price),
                baseCost: product.cost ? Number(product.cost) : null,
                baseStock: product.stock || 0,
                locations: locationData
            }
        })

        return NextResponse.json({
            products: result,
            locations: locations.map(l => ({ id: l.id, name: l.name })),
            total: products.length
        })

    } catch (error) {
        console.error('Cross-store search error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Update prices per location
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
        const { productId, updates } = body
        // updates is array of { locationId, price, stock }

        if (!productId || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ error: 'Missing productId or updates' }, { status: 400 })
        }

        // Get the product
        const product = await prisma.item.findUnique({
            where: { id: productId },
            select: { id: true, franchiseId: true, price: true, name: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Verify access
        if (user.role !== 'PROVIDER' && product.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // For now, since we don't have per-location inventory model,
        // we'll update the base product price if all locations have the same price,
        // or we'd need to create location-specific overrides.

        // Check if all updates have the same price
        const prices = updates.map((u: any) => u.price).filter((p: any) => p !== undefined)
        const allSamePrice = prices.every((p: any) => p === prices[0])

        if (allSamePrice && prices.length > 0) {
            // Update base product price
            await prisma.item.update({
                where: { id: productId },
                data: { price: prices[0] }
            })
        } else {
            // For different prices per location, we'd need LocationItem model
            // For now, we'll use the first/lowest price as base
            // and log the intent
            const minPrice = Math.min(...prices)
            await prisma.item.update({
                where: { id: productId },
                data: { price: minPrice }
            })

            // Log the per-location price intent (would need LocationPriceOverride model)
            console.log('Per-location pricing requested:', { productId, updates })
        }

        // Update stock if provided
        const stocks = updates.map((u: any) => u.stock).filter((s: any) => s !== undefined)
        if (stocks.length > 0) {
            // Sum all location stocks as total
            const totalStock = stocks.reduce((sum: number, s: number) => sum + s, 0)
            await prisma.item.update({
                where: { id: productId },
                data: { stock: totalStock }
            })
        }

        // Create audit event
        try {
            // Get any location from updates
            const firstLocation = updates[0]?.locationId
            if (firstLocation) {
                const location = await prisma.location.findUnique({
                    where: { id: firstLocation },
                    select: { franchiseId: true }
                })

                if (location) {
                    await prisma.auditEvent.create({
                        data: {
                            locationId: firstLocation,
                            franchiseId: location.franchiseId,
                            eventType: 'PRICE_CHANGE',
                            severity: 'LOW',
                            employeeId: user.id,
                            employeeName: user.name,
                            details: JSON.stringify({
                                productId,
                                productName: product.name,
                                oldPrice: Number(product.price),
                                updates
                            })
                        }
                    })
                }
            }
        } catch (e) {
            // Audit creation optional
        }

        return NextResponse.json({
            success: true,
            message: allSamePrice
                ? 'Price updated for all locations'
                : 'Different prices logged - base price set to lowest'
        })

    } catch (error) {
        console.error('Cross-store update error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
