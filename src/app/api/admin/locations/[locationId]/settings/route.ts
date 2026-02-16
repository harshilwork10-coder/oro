/**
 * Provider: Update Location Settings
 * 
 * PATCH /api/admin/locations/[locationId]/settings
 * 
 * Allows Provider to update location-level settings like googlePlaceId.
 * Protected: requires PROVIDER role
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    req: Request,
    { params }: { params: { locationId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can use this endpoint
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Provider only' }, { status: 403 })
        }

        const body = await req.json()
        const { googlePlaceId } = body

        // Validate the location exists
        const location = await prisma.location.findUnique({
            where: { id: params.locationId },
            select: { id: true, name: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Update the location
        const updated = await prisma.location.update({
            where: { id: params.locationId },
            data: {
                googlePlaceId: googlePlaceId?.trim() || null
            },
            select: {
                id: true,
                name: true,
                googlePlaceId: true
            }
        })

        return NextResponse.json({
            success: true,
            location: updated
        })
    } catch (error) {
        console.error('[Provider Location Settings] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(
    req: Request,
    { params }: { params: { locationId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const location = await prisma.location.findUnique({
            where: { id: params.locationId },
            select: {
                id: true,
                name: true,
                googlePlaceId: true
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error) {
        console.error('[Provider Location Settings GET] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
