import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

/**
 * Resolve service values: brand + override
 * Returns the effective values for a location
 */
function resolveService(
    brand: {
        id: string
        name: string
        description: string | null
        duration: number
        basePrice: { toNumber: () => number }
        priceMode: string
        tierShortPrice: { toNumber: () => number } | null
        tierMediumPrice: { toNumber: () => number } | null
        tierLongPrice: { toNumber: () => number } | null
        commissionable: boolean
        taxTreatmentOverride: string | null
        isAddOn: boolean
    },
    override?: {
        name: string | null
        description: string | null
        duration: number | null
        price: { toNumber: () => number } | null
        cashPrice: { toNumber: () => number } | null
        cardPrice: { toNumber: () => number } | null
        tierShortPrice: { toNumber: () => number } | null
        tierMediumPrice: { toNumber: () => number } | null
        tierLongPrice: { toNumber: () => number } | null
        isEnabled: boolean
        isLocked: boolean
    } | null
) {
    return {
        id: brand.id,
        name: override?.name ?? brand.name,
        description: override?.description ?? brand.description,
        duration: override?.duration ?? brand.duration,
        price: override?.price?.toNumber() ?? brand.basePrice.toNumber(),
        cashPrice: override?.cashPrice?.toNumber() ?? brand.basePrice.toNumber(),
        cardPrice: override?.cardPrice?.toNumber(),
        priceMode: brand.priceMode,
        tierShortPrice: override?.tierShortPrice?.toNumber() ?? brand.tierShortPrice?.toNumber(),
        tierMediumPrice: override?.tierMediumPrice?.toNumber() ?? brand.tierMediumPrice?.toNumber(),
        tierLongPrice: override?.tierLongPrice?.toNumber() ?? brand.tierLongPrice?.toNumber(),
        commissionable: brand.commissionable,
        taxTreatmentOverride: brand.taxTreatmentOverride,
        isAddOn: brand.isAddOn,
        isEnabled: override?.isEnabled ?? true,
        isLocked: override?.isLocked ?? false,
        hasOverride: !!override,
        brandServiceId: brand.id
    }
}

// GET: Fetch resolved services for a franchise location
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const searchParams = req.nextUrl.searchParams
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return ApiResponse.badRequest('locationId is required')
        }

        // Get location and its franchisor
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchisorId: true, canCustomizePricing: true }
        })

        if (!location?.franchisorId) {
            return ApiResponse.notFound('Location or franchisor not found')
        }

        // Get brand services
        const brandServices = await prisma.globalService.findMany({
            where: {
                franchisorId: location.franchisorId,
                isActive: true,
                isArchived: false
            },
            include: {
                category: true
            },
            orderBy: { name: 'asc' }
        })

        // Get overrides for this location
        const overrides = await prisma.locationServiceOverride.findMany({
            where: { locationId }
        })

        const overrideMap = new Map(
            overrides.map(o => [o.globalServiceId, o])
        )

        // Resolve each service
        const resolvedServices = brandServices.map(brand => ({
            ...resolveService(brand, overrideMap.get(brand.id)),
            category: brand.category
        }))

        // Filter out disabled services
        const enabledServices = resolvedServices.filter(s => s.isEnabled)

        return ApiResponse.success({
            services: enabledServices,
            totalBrandServices: brandServices.length,
            totalOverrides: overrides.length,
            canCustomizePricing: location.canCustomizePricing // Permission flag
        })

    } catch (error) {
        console.error('Error fetching franchise catalog:', error)
        return ApiResponse.serverError('Failed to fetch franchise catalog')
    }
}
