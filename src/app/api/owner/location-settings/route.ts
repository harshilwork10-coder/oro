/**
 * Owner Location Settings API
 * 
 * GET  /api/owner/location-settings - Get location settings (including googlePlaceId)
 * PATCH /api/owner/location-settings - Update location settings
 * 
 * Protected by session auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Get locations
        let franchiseId = user.franchiseId;
        if (!franchiseId || franchiseId === '__SYSTEM__') {
            // Need a way for Providers to know which franchise they are editing from Owner Dashboard context.
            // If the provider is visiting /owner/settings, they should simulate a franchise context. Look for search params.
            const url = new URL(req.url);
            const queryFranchiseId = url.searchParams.get('franchiseId');
            if (queryFranchiseId) {
                franchiseId = queryFranchiseId;
            } else {
                // Return empty if we don't have a franchise context
                return NextResponse.json({ locations: [] });
            }
        }

        const locations = await prisma.location.findMany({
            where: { franchiseId: franchiseId },
            select: {
                id: true,
                googlePlaceId: true,
                name: true
            }
        })

        return NextResponse.json({
            locations,
            // Legacy fallbacks
            locationId: locations[0]?.id || null,
            locationName: locations[0]?.name || null,
            googlePlaceId: locations[0]?.googlePlaceId || null
        })
    } catch (error) {
        console.error('[Location Settings GET] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Only Provider can edit location settings.' }, { status: 403 })
        }

        const body = await req.json()
        const { googlePlaceId, locationId } = body

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        const updated = await prisma.location.update({
            where: { id: locationId },
            data: {
                googlePlaceId: googlePlaceId?.trim() || null
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email || 'unknown',
            userRole: user.role,
            action: 'LOCATION_SETTINGS_UPDATE',
            entityType: 'Location',
            entityId: locationId,
            metadata: { googlePlaceId: googlePlaceId?.trim() || null }
        })

        return NextResponse.json({
            success: true,
            locationId: updated.id,
            googlePlaceId: updated.googlePlaceId
        })
    } catch (error) {
        console.error('[Location Settings PATCH] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
