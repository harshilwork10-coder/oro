import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get centralized inventory view across all locations
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchise
        let franchiseId = user.franchiseId

        // For Provider, get a default franchise or require query param
        if (user.role === 'PROVIDER') {
            const { searchParams } = new URL(request.url)
            franchiseId = searchParams.get('franchiseId')
            if (!franchiseId) {
                // Get first franchise
                const firstFranchise = await prisma.franchise.findFirst()
                franchiseId = firstFranchise?.id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ locationInventories: [], productsAcross: [] })
        }

        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        })

        // Get all products with stock info (use franchiseId-based stock)
        const products = await prisma.product.findMany({
            where: { franchiseId, isActive: true },
            select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                cost: true,
                stock: true,
                reorderPoint: true
            },
            orderBy: { name: 'asc' }
        })

        // Get unified Items with per-location StockOnHand
        const items = await prisma.item.findMany({
            where: { franchiseId, isActive: true, type: 'PRODUCT' },
            select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                cost: true,
                stock: true,
                reorderPoint: true,
                stockOnHand: {
                    select: {
                        locationId: true,
                        qtyOnHand: true,
                        reorderPoint: true,
                        location: { select: { name: true } }
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Build location inventories
        const locationInventories = locations.map((location) => {
            // For products without StockOnHand, we'll show the global stock for each location
            const productsForLocation = products

            // Get stock on hand for items at this location
            const itemsWithStock = items.filter(item =>
                item.stockOnHand.some(s => s.locationId === location.id)
            )

            const totalProducts = productsForLocation.length + itemsWithStock.length

            // Calculate total value from global products (split evenly for demo)
            const productValue = productsForLocation.reduce((sum, p) => {
                const stockPerLocation = Math.floor((p.stock || 0) / Math.max(locations.length, 1))
                return sum + (Number(p.price) * stockPerLocation)
            }, 0)

            // Value from items with StockOnHand
            const itemValue = itemsWithStock.reduce((sum, item) => {
                const soh = item.stockOnHand.find(s => s.locationId === location.id)
                return sum + (Number(item.price) * Number(soh?.qtyOnHand || 0))
            }, 0)

            // Low stock count from items
            const lowStockItems = itemsWithStock.filter(item => {
                const soh = item.stockOnHand.find(s => s.locationId === location.id)
                const qty = Number(soh?.qtyOnHand || 0)
                const reorder = soh?.reorderPoint || item.reorderPoint || 5
                return qty > 0 && qty <= reorder
            }).length

            // Out of stock from items
            const outOfStockItems = itemsWithStock.filter(item => {
                const soh = item.stockOnHand.find(s => s.locationId === location.id)
                return Number(soh?.qtyOnHand || 0) === 0
            }).length

            // Top products by value
            const topProducts = itemsWithStock
                .map(item => {
                    const soh = item.stockOnHand.find(s => s.locationId === location.id)
                    return {
                        id: item.id,
                        name: item.name,
                        stock: Number(soh?.qtyOnHand || 0),
                        price: Number(item.price)
                    }
                })
                .filter(p => p.stock > 0)
                .sort((a, b) => (b.price * b.stock) - (a.price * a.stock))
                .slice(0, 5)

            return {
                locationId: location.id,
                locationName: location.name,
                totalProducts,
                totalValue: productValue + itemValue,
                lowStock: lowStockItems,
                outOfStock: outOfStockItems,
                topProducts
            }
        })

        // Build products across locations (global products show same stock for all)
        const productsAcross = products.map(product => ({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            price: Number(product.price),
            cost: product.cost ? Number(product.cost) : null,
            locations: locations.map(loc => ({
                locationId: loc.id,
                locationName: loc.name,
                stock: Math.floor((product.stock || 0) / Math.max(locations.length, 1)),
                reorderPoint: product.reorderPoint
            })),
            totalStock: product.stock || 0
        }))

        // Add items with StockOnHand (true per-location stock)
        const itemsAcross = items.map(item => ({
            productId: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            price: Number(item.price),
            cost: item.cost ? Number(item.cost) : null,
            locations: locations.map(loc => {
                const soh = item.stockOnHand.find(s => s.locationId === loc.id)
                return {
                    locationId: loc.id,
                    locationName: loc.name,
                    stock: soh ? Number(soh.qtyOnHand) : 0,
                    reorderPoint: soh?.reorderPoint || item.reorderPoint
                }
            }),
            totalStock: item.stockOnHand.reduce((sum, s) => sum + Number(s.qtyOnHand), 0)
        }))

        return NextResponse.json({
            locationInventories,
            productsAcross: [...productsAcross, ...itemsAcross],
            locations,
            summary: {
                totalLocations: locations.length,
                totalProducts: productsAcross.length + itemsAcross.length,
                totalValue: locationInventories.reduce((s, l) => s + l.totalValue, 0),
                lowStockTotal: locationInventories.reduce((s, l) => s + l.lowStock, 0),
                outOfStockTotal: locationInventories.reduce((s, l) => s + l.outOfStock, 0)
            }
        })

    } catch (error) {
        console.error('Centralized inventory error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

