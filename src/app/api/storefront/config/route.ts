import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/storefront/config — Read storefront config for user's location
// PUT /api/storefront/config — Update storefront config
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Get user's franchise and first location
        const franchise = user.franchiseId
            ? await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                include: { locations: { select: { id: true, name: true, slug: true }, take: 1 } }
            })
            : null

        if (!franchise?.locations?.[0]) {
            return NextResponse.json({ error: 'No location found' }, { status: 404 })
        }

        const locationId = franchise.locations[0].id
        const location = franchise.locations[0]

        let config = await prisma.storefrontProfile.findUnique({
            where: { locationId }
        })

        // Auto-create if doesn't exist
        if (!config) {
            config = await prisma.storefrontProfile.create({
                data: { locationId }
            })
        }

        // Fetch categories for the multi-select
        const categories = await prisma.unifiedCategory.findMany({
            where: { franchiseId: franchise.id, isActive: true },
            select: { id: true, name: true },
            orderBy: { sortOrder: 'asc' }
        })

        return NextResponse.json({
            config,
            location: { id: location.id, name: location.name, slug: location.slug },
            categories,
        })
    } catch (error) {
        console.error('[STOREFRONT_CONFIG_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchise = user.franchiseId
            ? await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                include: { locations: { select: { id: true }, take: 1 } }
            })
            : null

        if (!franchise?.locations?.[0]) {
            return NextResponse.json({ error: 'No location found' }, { status: 404 })
        }

        const locationId = franchise.locations[0].id
        const body = await req.json()

        // Whitelist allowed fields
        const allowed: Record<string, any> = {}
        const fields = [
            'isEnabled', 'headline', 'bannerImageUrl',
            'showAllCategories', 'visibleCategoryIds', 'hiddenItemIds', 'hideOutOfStock',
            'pickupEnabled', 'pickupLeadMinutes', 'maxOrdersPerSlot',
            'minOrderAmount', 'maxItemsPerOrder', 'orderNotesEnabled'
        ]
        for (const f of fields) {
            if (body[f] !== undefined) allowed[f] = body[f]
        }

        // Ensure JSON arrays are stored as strings
        if (allowed.visibleCategoryIds && Array.isArray(allowed.visibleCategoryIds)) {
            allowed.visibleCategoryIds = JSON.stringify(allowed.visibleCategoryIds)
        }
        if (allowed.hiddenItemIds && Array.isArray(allowed.hiddenItemIds)) {
            allowed.hiddenItemIds = JSON.stringify(allowed.hiddenItemIds)
        }

        const config = await prisma.storefrontProfile.upsert({
            where: { locationId },
            update: allowed,
            create: { locationId, ...allowed }
        })

        return NextResponse.json({ config })
    } catch (error) {
        console.error('[STOREFRONT_CONFIG_PUT]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
