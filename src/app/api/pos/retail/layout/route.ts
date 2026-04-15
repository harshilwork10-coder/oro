import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET — Return POS register layout config for current user's location
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user.locationId && !user.franchiseId) {
            return NextResponse.json({ error: 'No location associated' }, { status: 400 })
        }

        // Get locationId from user's session or their franchise's first location
        let locationId = user.locationId
        if (!locationId && user.franchiseId) {
            const location = await prisma.location.findFirst({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            locationId = location?.id
        }

        if (!locationId) {
            return NextResponse.json({ config: null })
        }

        const layout = await prisma.posRegisterLayout.findUnique({
            where: { locationId }
        })

        return NextResponse.json({
            config: layout?.config || null,
            locationId
        })
    } catch (error) {
        console.error('[POS_LAYOUT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 })
    }
}

// PUT — Save POS register layout config (manager/owner/franchisor only)
export async function PUT(req: NextRequest) {
    try {
        // Only managers+ can modify layout
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Only owners can modify POS layout' }, { status: 403 })
        }

        let locationId = user.locationId
        if (!locationId && user.franchiseId) {
            const location = await prisma.location.findFirst({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            locationId = location?.id
        }

        if (!locationId) {
            return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        const body = await req.json()
        const { pinnedCategoryIds, categoryOverrides, quickFilters } = body

        if (!pinnedCategoryIds || !Array.isArray(pinnedCategoryIds)) {
            return NextResponse.json({ error: 'pinnedCategoryIds array is required' }, { status: 400 })
        }

        const config = {
            pinnedCategoryIds,
            categoryOverrides: categoryOverrides || {},
            quickFilters: quickFilters || {}
        }

        const layout = await prisma.posRegisterLayout.upsert({
            where: { locationId },
            update: { config },
            create: { locationId, config }
        })

        return NextResponse.json({ config: layout.config, locationId })
    } catch (error) {
        console.error('[POS_LAYOUT_PUT]', error)
        return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 })
    }
}
