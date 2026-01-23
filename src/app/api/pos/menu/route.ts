/**
 * POS Menu API
 * 
 * GET /api/pos/menu
 * 
 * Returns services, products, discounts, and categories for POS display.
 * Uses withPOSAuth() wrapper - station scope from validated token ONLY.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'
import crypto from 'crypto'

// Generate ETag from menu data for efficient Android refresh
function generateETag(services: unknown[], products: unknown[], discounts: unknown[]): string {
    const content = JSON.stringify({
        s: services.length,
        p: products.length,
        d: discounts.length,
        // Include first/last IDs to detect changes
        sf: (services[0] as { id?: string })?.id,
        sl: (services[services.length - 1] as { id?: string })?.id,
        pf: (products[0] as { id?: string })?.id,
        pl: (products[products.length - 1] as { id?: string })?.id
    })
    return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * GET /api/pos/menu
 * 
 * Protected by withPOSAuth - requires X-Station-Token header
 * franchiseId comes from validated token, NEVER from client
 */
export const GET = withPOSAuth(async (req: Request, ctx: POSContext) => {
    // SECURITY: franchiseId from validated token only
    const { franchiseId } = ctx

    try {
        // Fetch real services from database
        const services = await prisma.service.findMany({
            where: { franchiseId },
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        })

        // Fetch real products from database
        const products = await prisma.product.findMany({
            where: { franchiseId, isActive: true },
            orderBy: { name: 'asc' }
        })

        // Fetch discounts from database
        const discounts = await prisma.discount.findMany({
            where: { franchiseId, isActive: true }
        })

        // Generate ETag for efficient Android refresh
        const etag = `"${generateETag(services, products, discounts)}"`
        const clientETag = req.headers.get('If-None-Match')

        // If ETag matches, return 304 Not Modified (Android can skip download)
        if (clientETag && clientETag === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    'ETag': etag,
                    'Cache-Control': 'private, must-revalidate'
                }
            })
        }

        // Transform services to include category string for POS compatibility
        const servicesFormatted = services.map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: parseFloat(service.price.toString()),
            duration: service.duration,
            category: service.serviceCategory?.name || 'SERVICES',  // Default to avoid null
            franchiseId: service.franchiseId
        }))

        // Transform products for POS
        const productsFormatted = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price.toString()),
            stock: product.stock,
            category: product.category || 'PRODUCTS',
            franchiseId: product.franchiseId
        }))

        // Fetch categories for Android
        const categories = await prisma.serviceCategory.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        })

        return NextResponse.json({
            services: servicesFormatted,
            products: productsFormatted,
            discounts,
            categories,
            // Metadata for Android
            meta: {
                serviceCount: servicesFormatted.length,
                productCount: productsFormatted.length,
                discountCount: discounts.length,
                categoryCount: categories.length,
                lastUpdated: new Date().toISOString()
            }
        }, {
            headers: {
                'ETag': etag,
                'Last-Modified': new Date().toUTCString(),
                'Cache-Control': 'private, must-revalidate'
            }
        })
    } catch (error) {
        console.error('[API_MENU_ERROR]', error)
        return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 })
    }
})
