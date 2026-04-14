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
import { buildPOSMenu } from '@/lib/pos/menuBuilder'

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
    // SECURITY: franchiseId and locationId from validated token only
    const { franchiseId, locationId } = ctx

    try {
        // Fetch location to get franchisorId
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchisorId: true }
        })

        const posMenu = await buildPOSMenu(franchiseId, locationId, location?.franchisorId)

        // Generate ETag for efficient Android refresh
        const etag = `"${generateETag(posMenu.services, posMenu.products, posMenu.discounts)}"`
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

        return NextResponse.json({
            ...posMenu,
            // Metadata for Android
            meta: {
                serviceCount: posMenu.services.length,
                productCount: posMenu.products.length,
                discountCount: posMenu.discounts.length,
                categoryCount: posMenu.categories.length,
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
