import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Return POS register layout config for current user's location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.locationId && !user.franchiseId) {
            return ApiResponse.error('No location associated', 400)
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
            return ApiResponse.success({ config: null })
        }

        const layout = await (prisma as any).posRegisterLayout.findUnique({
            where: { locationId }
        })

        return ApiResponse.success({
            config: layout?.config || null,
            locationId
        })
    } catch (error) {
        console.error('[POS_LAYOUT_GET]', error)
        return ApiResponse.serverError('Failed to fetch layout')
    }
}

// PUT — Save POS register layout config (manager/owner/franchisor only)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        // Only managers+ can modify layout
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can modify POS layout')
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
            return ApiResponse.error('No location found', 400)
        }

        const body = await request.json()
        const { pinnedCategoryIds, categoryOverrides, quickFilters } = body

        if (!pinnedCategoryIds || !Array.isArray(pinnedCategoryIds)) {
            return ApiResponse.error('pinnedCategoryIds array is required', 400)
        }

        const config = {
            pinnedCategoryIds,
            categoryOverrides: categoryOverrides || {},
            quickFilters: quickFilters || {}
        }

        const layout = await (prisma as any).posRegisterLayout.upsert({
            where: { locationId },
            update: { config },
            create: { locationId, config }
        })

        return ApiResponse.success({ config: layout.config, locationId })
    } catch (error) {
        console.error('[POS_LAYOUT_PUT]', error)
        return ApiResponse.serverError('Failed to save layout')
    }
}
