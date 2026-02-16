/**
 * Owner Location Settings API
 * 
 * GET  /api/owner/location-settings - Get location settings (including googlePlaceId)
 * PATCH /api/owner/location-settings - Update location settings
 * 
 * Protected by session auth - requires OWNER role
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with franchise → locations
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, role: true }
        })

        if (!user?.franchiseId || !['OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get the first location for this franchise
        const location = await prisma.location.findFirst({
            where: { franchiseId: user.franchiseId },
            select: {
                id: true,
                googlePlaceId: true,
                name: true
            }
        })

        return NextResponse.json({
            locationId: location?.id || null,
            locationName: location?.name || null,
            googlePlaceId: location?.googlePlaceId || null
        })
    } catch (error) {
        console.error('[Location Settings GET] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, role: true }
        })

        if (!user?.franchiseId || !['OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { googlePlaceId } = body

        if (googlePlaceId !== undefined && typeof googlePlaceId !== 'string') {
            return NextResponse.json({ error: 'Invalid googlePlaceId' }, { status: 400 })
        }

        // Update ALL locations for this franchise (same Place ID for the business)
        const updated = await prisma.location.updateMany({
            where: { franchiseId: user.franchiseId },
            data: {
                googlePlaceId: googlePlaceId?.trim() || null
            }
        })

        return NextResponse.json({
            success: true,
            updated: updated.count,
            googlePlaceId: googlePlaceId?.trim() || null
        })
    } catch (error) {
        console.error('[Location Settings PATCH] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
