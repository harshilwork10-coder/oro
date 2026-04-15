import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// PUT: Create or update override for a location
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ brandServiceId: string }> }
) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { brandServiceId } = await params
        const body = await req.json()
        const {
            locationId,
            name,
            description,
            duration,
            price,
            cashPrice,
            cardPrice,
            tierShortPrice,
            tierMediumPrice,
            tierLongPrice,
            isEnabled = true,
            isLocked = false
        } = body

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Verify the brand service exists
        const brandService = await prisma.globalService.findUnique({
            where: { id: brandServiceId }
        })

        if (!brandService) {
            return NextResponse.json({ error: 'Brand service' }, { status: 404 })
        }

        // Check if location has permission to customize pricing
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { canCustomizePricing: true, franchisorId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location' }, { status: 404 })
        }

        if (!location.canCustomizePricing) {
            return NextResponse.json({ error: 'This location is not allowed to customize pricing. Contact your franchisor.' }, { status: 403 })
        }

        // Upsert the override
        const override = await prisma.locationServiceOverride.upsert({
            where: {
                globalServiceId_locationId: {
                    globalServiceId: brandServiceId,
                    locationId
                }
            },
            create: {
                globalServiceId: brandServiceId,
                locationId,
                name,
                description,
                duration: duration !== undefined ? parseInt(duration) : null,
                price,
                cashPrice,
                cardPrice,
                tierShortPrice,
                tierMediumPrice,
                tierLongPrice,
                isEnabled,
                isLocked
            },
            update: {
                name,
                description,
                duration: duration !== undefined ? parseInt(duration) : undefined,
                price,
                cashPrice,
                cardPrice,
                tierShortPrice,
                tierMediumPrice,
                tierLongPrice,
                isEnabled,
                isLocked
            }
        })

        return NextResponse.json({ override })

    } catch (error) {
        console.error('Error creating/updating override:', error)
        return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
    }
}

// DELETE: Remove override (revert to brand values)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ brandServiceId: string }> }
) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { brandServiceId } = await params
        const searchParams = req.nextUrl.searchParams
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Delete the override (reverts to brand values)
        await prisma.locationServiceOverride.deleteMany({
            where: {
                globalServiceId: brandServiceId,
                locationId
            }
        })

        return NextResponse.json({ message: 'Override removed, now using brand values' })

    } catch (error) {
        console.error('Error deleting override:', error)
        return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 })
    }
}
