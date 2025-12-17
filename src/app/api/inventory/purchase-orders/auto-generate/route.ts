import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/inventory/purchase-orders/auto-generate
// Automatically creates purchase orders for products below minStock level
export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all products that are below their minStock level
        const lowStockProducts = await prisma.product.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                isActive: true,
                minStock: { not: null },
                stock: { lte: prisma.product.fields.minStock }
            },
            include: {
                suppliers: {
                    include: { supplier: true }
                }
            }
        })

        // Fallback: Get products below reorderPoint if no minStock products
        let productsToOrder = lowStockProducts
        if (productsToOrder.length === 0) {
            const reorderProducts = await prisma.product.findMany({
                where: {
                    franchiseId: session.user.franchiseId,
                    isActive: true,
                    reorderPoint: { not: null }
                },
                include: {
                    suppliers: {
                        include: { supplier: true }
                    }
                }
            })

            productsToOrder = reorderProducts.filter(p =>
                p.reorderPoint !== null && p.stock <= p.reorderPoint
            )
        }

        if (productsToOrder.length === 0) {
            return NextResponse.json({
                message: 'No products need reordering',
                ordersCreated: 0
            })
        }

        // Get default location for the franchise
        const location = await prisma.location.findFirst({
            where: {
                franchise: { id: session.user.franchiseId }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        // Group products by supplier
        const productsBySupplier: Record<string, typeof productsToOrder> = {}

        for (const product of productsToOrder) {
            // Use first supplier or a default
            const supplier = product.suppliers[0]?.supplier
            const supplierId = supplier?.id || 'default'

            if (!productsBySupplier[supplierId]) {
                productsBySupplier[supplierId] = []
            }
            productsBySupplier[supplierId].push(product)
        }

        // Create a PO for each supplier
        const createdOrders = []

        for (const [supplierId, products] of Object.entries(productsBySupplier)) {
            // Skip if no real supplier
            if (supplierId === 'default') {
                // Get or create a default supplier
                let defaultSupplier = await prisma.supplier.findFirst({
                    where: {
                        franchiseId: session.user.franchiseId,
                        name: 'General Supplier'
                    }
                })

                if (!defaultSupplier) {
                    defaultSupplier = await prisma.supplier.create({
                        data: {
                            franchiseId: session.user.franchiseId,
                            name: 'General Supplier'
                        }
                    })
                }

                const items = products.map(p => ({
                    productId: p.id,
                    quantity: (p.maxStock || (p.reorderPoint ? p.reorderPoint * 2 : 10)) - p.stock,
                    unitCost: p.cost ? parseFloat(p.cost.toString()) : 0,
                    totalCost: ((p.maxStock || (p.reorderPoint ? p.reorderPoint * 2 : 10)) - p.stock) *
                        (p.cost ? parseFloat(p.cost.toString()) : 0)
                }))

                const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0)

                const po = await prisma.purchaseOrder.create({
                    data: {
                        franchiseId: session.user.franchiseId,
                        supplierId: defaultSupplier.id,
                        locationId: location.id,
                        status: 'DRAFT',
                        totalCost,
                        items: { create: items }
                    }
                })

                createdOrders.push(po)
            } else {
                const items = products.map(p => {
                    const supplierProduct = p.suppliers.find(s => s.supplierId === supplierId)
                    const unitCost = supplierProduct?.cost
                        ? parseFloat(supplierProduct.cost.toString())
                        : (p.cost ? parseFloat(p.cost.toString()) : 0)
                    const orderQty = (p.maxStock || (p.reorderPoint ? p.reorderPoint * 2 : 10)) - p.stock

                    return {
                        productId: p.id,
                        quantity: orderQty,
                        unitCost,
                        totalCost: orderQty * unitCost
                    }
                })

                const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0)

                const po = await prisma.purchaseOrder.create({
                    data: {
                        franchiseId: session.user.franchiseId,
                        supplierId,
                        locationId: location.id,
                        status: 'DRAFT',
                        totalCost,
                        items: { create: items }
                    }
                })

                createdOrders.push(po)
            }
        }

        return NextResponse.json({
            message: `Created ${createdOrders.length} purchase order(s)`,
            ordersCreated: createdOrders.length,
            orders: createdOrders
        })
    } catch (error) {
        console.error('Failed to auto-generate purchase orders:', error)
        return NextResponse.json({ error: 'Failed to auto-generate purchase orders' }, { status: 500 })
    }
}
