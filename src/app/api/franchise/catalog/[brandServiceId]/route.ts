import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

// PUT: Create or update override for a location
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ brandServiceId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
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
            return ApiResponse.badRequest('locationId is required')
        }

        // Verify the brand service exists
        const brandService = await prisma.globalService.findUnique({
            where: { id: brandServiceId }
        })

        if (!brandService) {
            return ApiResponse.notFound('Brand service')
        }

        // Check if location has permission to customize pricing
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { canCustomizePricing: true, franchisorId: true }
        })

        if (!location) {
            return ApiResponse.notFound('Location')
        }

        if (!location.canCustomizePricing) {
            return ApiResponse.forbidden('This location is not allowed to customize pricing. Contact your franchisor.')
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

        return ApiResponse.success({ override })

    } catch (error) {
        console.error('Error creating/updating override:', error)
        return ApiResponse.serverError('Failed to save override')
    }
}

// DELETE: Remove override (revert to brand values)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ brandServiceId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const { brandServiceId } = await params
        const searchParams = req.nextUrl.searchParams
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return ApiResponse.badRequest('locationId is required')
        }

        // Delete the override (reverts to brand values)
        await prisma.locationServiceOverride.deleteMany({
            where: {
                globalServiceId: brandServiceId,
                locationId
            }
        })

        return ApiResponse.success({ message: 'Override removed, now using brand values' })

    } catch (error) {
        console.error('Error deleting override:', error)
        return ApiResponse.serverError('Failed to delete override')
    }
}
