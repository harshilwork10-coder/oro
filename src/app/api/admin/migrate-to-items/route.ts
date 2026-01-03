'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Data Migration API
 * Migrates existing Products and Services to the unified Item table
 * 
 * POST /api/admin/migrate-to-items
 * 
 * This is a one-time migration endpoint. Run it once to populate the Item table.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        // Only PROVIDER or OWNER can run migrations
        if (!session?.user || !['PROVIDER', 'OWNER'].includes(session.user.role || '')) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
        }

        const results = {
            productsProcessed: 0,
            productsMigrated: 0,
            productsSkipped: 0,
            servicesProcessed: 0,
            servicesMigrated: 0,
            servicesSkipped: 0,
            errors: [] as string[]
        }

        // Get all Products
        const products = await prisma.product.findMany({
            include: {
                productCategory: true
            }
        })

        // Migrate Products to Items
        for (const product of products) {
            results.productsProcessed++

            try {
                // Check if item with same barcode already exists
                if (product.barcode) {
                    const existing = await prisma.item.findFirst({
                        where: {
                            franchiseId: product.franchiseId,
                            barcode: product.barcode
                        }
                    })
                    if (existing) {
                        results.productsSkipped++
                        continue
                    }
                }

                await prisma.item.create({
                    data: {
                        franchiseId: product.franchiseId,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        type: 'PRODUCT',
                        isActive: product.isActive ?? true,

                        // Product-specific fields
                        barcode: product.barcode,
                        sku: product.sku,
                        stock: product.stock,
                        cost: product.cost,
                        reorderPoint: product.reorderPoint,
                        brand: product.brand,
                        size: product.size,

                        // Compliance
                        ageRestricted: product.ageRestricted ?? false,
                        minimumAge: product.minimumAge,
                        isEbtEligible: product.isEbtEligible ?? false,
                        isTobacco: product.isTobacco ?? false,
                    }
                })
                results.productsMigrated++
            } catch (error: any) {
                results.errors.push(`Product ${product.name}: ${error.message}`)
            }
        }

        // Get all Services
        const services = await prisma.service.findMany({
            include: {
                serviceCategory: true
            }
        })

        // Migrate Services to Items
        for (const service of services) {
            results.servicesProcessed++

            try {
                // Check if item with same name in same franchise already exists
                const existing = await prisma.item.findFirst({
                    where: {
                        franchiseId: service.franchiseId,
                        name: service.name,
                        type: 'SERVICE'
                    }
                })
                if (existing) {
                    results.servicesSkipped++
                    continue
                }

                await prisma.item.create({
                    data: {
                        franchiseId: service.franchiseId,
                        name: service.name,
                        description: service.description,
                        price: service.price,
                        type: 'SERVICE',
                        isActive: true,
                        sortOrder: 0,

                        // Service-specific fields
                        duration: service.duration,
                    }
                })
                results.servicesMigrated++
            } catch (error: any) {
                results.errors.push(`Service ${service.name}: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Migration completed',
            results
        })

    } catch (error) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
    }
}

// GET - Check migration status
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const [productCount, serviceCount, itemCount] = await Promise.all([
            prisma.product.count(),
            prisma.service.count(),
            prisma.item.count()
        ])

        const itemsByType = await prisma.item.groupBy({
            by: ['type'],
            _count: true
        })

        return NextResponse.json({
            legacy: {
                products: productCount,
                services: serviceCount
            },
            unified: {
                total: itemCount,
                byType: itemsByType
            },
            migrationNeeded: itemCount === 0 && (productCount > 0 || serviceCount > 0)
        })

    } catch (error) {
        console.error('Error checking migration status:', error)
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
    }
}

