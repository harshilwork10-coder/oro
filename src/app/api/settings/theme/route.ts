import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// GET - Fetch current theme settings
export async function GET() {
    try {
        const cookieStore = await cookies()
        const locationId = cookieStore.get('locationId')?.value

        if (!locationId) {
            // Return default theme if no location
            return NextResponse.json({
                themeId: 'classic_oro',
                highContrast: false
            })
        }

        // Get theme from Location
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { themeId: true, highContrast: true }
        })

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

// PUT - Update theme settings
export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies()
        const locationId = cookieStore.get('locationId')?.value

        if (!locationId) {
            return NextResponse.json(
                { error: 'No location selected' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { themeId, highContrast } = body

        // Validate themeId
        const validThemes = ['classic_oro', 'rose_gold', 'blush_pink', 'lavender_night', 'mint_clean', 'ocean_blue']
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

        // Update location
        const location = await prisma.location.update({
            where: { id: locationId },
            data: updateData,
            select: { themeId: true, highContrast: true }
        })

        return NextResponse.json({
            themeId: location.themeId,
            highContrast: location.highContrast,
            message: 'Theme saved successfully'
        })
    } catch (error) {
        console.error('Error saving theme:', error)
        return NextResponse.json(
            { error: 'Failed to save theme' },
            { status: 500 }
        )
    }
}
