import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { logActivity } from '@/lib/auditLog'

// GET - Fetch location-specific settings
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const location = await prisma.location.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                storeHours: true,
                settings: true,
                type: true,
                isActive: true,
                franchise: { select: { name: true } }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json({ settings: location })
    } catch (error) {
        console.error('[ADMIN_LOCATION_SETTINGS]', error)
        return NextResponse.json({ error: 'Failed to fetch location settings' }, { status: 500 })
    }
}

// PATCH - Update location-specific settings
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser(request)
        if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const location = await prisma.location.update({
            where: { id: params.id },
            data: body
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email || 'unknown',
            userRole: user.role || 'PROVIDER',
            action: 'LOCATION_SETTINGS_UPDATE',
            entityType: 'Location',
            entityId: params.id,
            metadata: { fields: Object.keys(body) }
        })

        return NextResponse.json({ success: true, location })
    } catch (error) {
        console.error('[ADMIN_LOCATION_SETTINGS_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
