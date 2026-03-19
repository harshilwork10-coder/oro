import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { THEME_PRESETS } from '@/lib/themes'

// GET - Fetch current theme settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            // Return defaults for unauthenticated requests (Android initial load)
            return NextResponse.json({
                themeId: 'classic_oro',
                highContrast: false
            })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({
                themeId: 'classic_oro',
                highContrast: false
            })
        }

        // Get theme from the user's franchise location
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { locations: { take: 1, select: { themeId: true, highContrast: true } } }
        })

        const location = franchise?.locations?.[0]
        return NextResponse.json({
            themeId: location?.themeId || 'classic_oro',
            highContrast: location?.highContrast || false
        })
    } catch (error) {
        console.error('Error fetching theme:', error)
        return NextResponse.json({
            themeId: 'classic_oro',
            highContrast: false
        })
    }
}

// PUT - Update theme settings (requires auth + OWNER/MANAGER role)
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Any business role can change their theme
        const allowedRoles = ['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'ADMIN']
        if (!allowedRoles.includes(user.role)) {
            console.error('[THEME] Permission denied for role:', user.role)
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        if (!user.franchiseId) {
            return NextResponse.json(
                { error: 'No franchise associated' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { themeId, highContrast, locationId } = body

        console.error(`[THEME PUT] user=${user.email} role=${user.role} franchiseId=${user.franchiseId} themeId=${themeId} locationId=${locationId || 'ALL'}`)

        // Validate themeId
        const validThemes = Object.keys(THEME_PRESETS)
        if (themeId && !validThemes.includes(themeId)) {
            return NextResponse.json(
                { error: 'Invalid theme ID' },
                { status: 400 }
            )
        }

        // Build update data
        const updateData: Record<string, string | boolean> = {}
        if (themeId !== undefined) updateData.themeId = themeId
        if (highContrast !== undefined) updateData.highContrast = highContrast

        // If locationId provided, update specific location (verify it belongs to user's franchise)
        if (locationId) {
            const location = await prisma.location.findFirst({
                where: { id: locationId, franchiseId: user.franchiseId }
            })
            if (!location) {
                return NextResponse.json({ error: 'Location not found' }, { status: 404 })
            }

            const updated = await prisma.location.update({
                where: { id: locationId },
                data: updateData,
                select: { themeId: true, highContrast: true }
            })
            return NextResponse.json({
                themeId: updated.themeId,
                highContrast: updated.highContrast,
                message: 'Theme saved successfully'
            })
        }

        // No locationId — update all locations for this franchise
        await prisma.location.updateMany({
            where: { franchiseId: user.franchiseId },
            data: updateData
        })

        return NextResponse.json({
            themeId: themeId || 'classic_oro',
            highContrast: highContrast || false,
            message: 'Theme saved for all locations'
        })
    } catch (error) {
        console.error('Error saving theme:', error)
        return NextResponse.json(
            { error: 'Failed to save theme' },
            { status: 500 }
        )
    }
}
