import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch directory settings for current location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { locationId: true, franchiseId: true }
        })

        if (!user?.locationId) {
            return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
        }

        const location = await prisma.location.findUnique({
            where: { id: user.locationId },
            select: {
                showInDirectory: true,
                publicName: true,
                publicDescription: true,
                publicPhone: true,
                businessType: true,
                latitude: true,
                longitude: true,
                operatingHours: true,
                publicLogoUrl: true,
                publicBannerUrl: true,
                name: true,
                address: true
            }
        })

        return NextResponse.json({
            ...location,
            publicName: location?.publicName || location?.name || ''
        })
    } catch (error) {
        console.error('Error fetching directory settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

// POST - Update directory settings
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { locationId: true, role: true }
        })

        if (!user?.locationId) {
            return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
        }

        // Only owners and managers can update directory settings
        if (!['OWNER', 'MANAGER', 'ADMIN', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const {
            showInDirectory,
            publicName,
            publicDescription,
            publicPhone,
            businessType,
            latitude,
            longitude,
            operatingHours,
            publicLogoUrl,
            publicBannerUrl
        } = body

        const updated = await prisma.location.update({
            where: { id: user.locationId },
            data: {
                showInDirectory: Boolean(showInDirectory),
                publicName: publicName || null,
                publicDescription: publicDescription || null,
                publicPhone: publicPhone || null,
                businessType: businessType || 'RETAIL',
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                operatingHours: operatingHours || null,
                publicLogoUrl: publicLogoUrl || null,
                publicBannerUrl: publicBannerUrl || null
            }
        })

        return NextResponse.json({
            success: true,
            showInDirectory: updated.showInDirectory
        })
    } catch (error) {
        console.error('Error updating directory settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}

