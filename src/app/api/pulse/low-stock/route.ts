import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get low stock alerts by location
// Returns products below threshold, grouped by location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                franchiseId: true,
                role: true,
                franchisor: {
                    select: {
                        franchises: {
                            select: { id: true }
                        }
                    }
                }
            }
        })

        // Determine franchise ID
        let franchiseId = user?.franchiseId
        if (!franchiseId && user?.franchisor?.franchises?.[0]) {
            franchiseId = user.franchisor.franchises[0].id
        }

        if (!franchiseId) {
            return NextResponse.json({ alerts: [], locations: [] })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const threshold = parseInt(searchParams.get('threshold') || '10')

        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        })

        // Get products with low stock (franchise-wide)
        const lowStockProducts = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                stock: { lte: threshold }
            },
            select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                stock: true,
                price: true,
                cost: true,
                category: true,
                productCategory: { select: { name: true } }
            },
            orderBy: { stock: 'asc' },
            take: 100
        })

        // NOTE: LocationProduct model is not yet implemented in schema
        // Using franchise-level product stock for now
        // TODO: Implement LocationProduct or StockOnHand model for per-location inventory tracking

        // Build alerts with location breakdown (using franchise-level stock for all locations)
        const alerts = lowStockProducts.map(product => {
            // Calculate per-location status (same stock for all until location-specific inventory is implemented)
            const locationBreakdown = locations.map(loc => {
                const stock = product.stock
                return {
                    locationId: loc.id,
                    locationName: loc.name,
                    stock,
                    isLow: stock <= threshold,
                    isCritical: stock <= Math.floor(threshold / 2),
                    isOutOfStock: stock === 0
                }
            })

            return {
                id: product.id,
                name: product.name,
                sku: product.sku || '',
                barcode: product.barcode || '',
                category: product.productCategory?.name || product.category || 'Uncategorized',
                franchiseStock: product.stock,
                price: Number(product.price),
                cost: Number(product.cost || 0),
                severity: product.stock === 0 ? 'critical' : product.stock <= threshold / 2 ? 'warning' : 'low',
                locations: locationBreakdown
            }
        })

        // Filter by location if specified
        const filteredAlerts = locationId
            ? alerts.filter(a => a.locations.some(l => l.locationId === locationId && l.isLow))
            : alerts

        // Summary stats
        const summary = {
            total: filteredAlerts.length,
            critical: filteredAlerts.filter(a => a.severity === 'critical').length,
            warning: filteredAlerts.filter(a => a.severity === 'warning').length,
            low: filteredAlerts.filter(a => a.severity === 'low').length,
            outOfStock: filteredAlerts.filter(a => a.franchiseStock === 0).length
        }

        return NextResponse.json({
            alerts: filteredAlerts,
            locations,
            threshold,
            summary
        })

    } catch (error) {
        console.error('Low stock alerts error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT: Update low stock threshold for franchise
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!['OWNER', 'FRANCHISOR', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { productId, threshold, locationId } = await request.json()

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        // Update product's reorder point (low stock threshold)
        await prisma.product.update({
            where: { id: productId },
            data: { reorderPoint: threshold || 10 }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Update threshold error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
