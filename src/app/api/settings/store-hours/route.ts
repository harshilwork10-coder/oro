'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Store hours and holiday schedule
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { storeHours: true, holidays: true, name: true }
        })

        return ApiResponse.success({
            locationName: location?.name,
            storeHours: location?.storeHours ? JSON.parse(location.storeHours as string) : null,
            holidays: location?.holidays ? JSON.parse(location.holidays as string) : []
        })
    } catch (error) {
        console.error('[STORE_HOURS_GET]', error)
        return ApiResponse.error('Failed to fetch store hours')
    }
}

// PUT — Update store hours or holidays
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { storeHours, holidays } = body

        // storeHours: { monday: { open: "06:00", close: "22:00" }, ... }
        // holidays: [{ date: "2026-12-25", name: "Christmas", closed: true }]

        const data: any = {}
        if (storeHours) data.storeHours = JSON.stringify(storeHours)
        if (holidays) data.holidays = JSON.stringify(holidays)

        await prisma.location.update({
            where: { id: locationId },
            data
        })

        return ApiResponse.success({ updated: true })
    } catch (error) {
        console.error('[STORE_HOURS_PUT]', error)
        return ApiResponse.error('Failed to update store hours')
    }
}
