import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Store Hours — Get/update store hours and holiday schedule
 * GET /api/settings/store-hours
 * PUT /api/settings/store-hours (Owner+ only)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const location = await prisma.location.findUnique({
            where: { id: user.locationId },
            select: { storeHours: true, holidays: true, name: true }
        })

        return NextResponse.json({
            locationName: location?.name,
            storeHours: location?.storeHours ? JSON.parse(location.storeHours as string) : null,
            holidays: location?.holidays ? JSON.parse(location.holidays as string) : []
        })
    } catch (error: any) {
        console.error('[STORE_HOURS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch store hours' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { storeHours, holidays } = await req.json()
        const data: any = {}
        if (storeHours) data.storeHours = JSON.stringify(storeHours)
        if (holidays) data.holidays = JSON.stringify(holidays)

        await prisma.location.update({ where: { id: user.locationId }, data })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'STORE_HOURS_UPDATED', entityType: 'Location', entityId: user.locationId,
            details: { hasStoreHours: !!storeHours, hasHolidays: !!holidays }
        })

        return NextResponse.json({ updated: true })
    } catch (error: any) {
        console.error('[STORE_HOURS_PUT]', error)
        return NextResponse.json({ error: 'Failed to update store hours' }, { status: 500 })
    }
}
