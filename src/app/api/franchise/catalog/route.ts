import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
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
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
        }

        // Get location and its franchisor (cast as any — schema may differ)
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchisorId: true, canCustomizePricing: true }
        })

        if (!location?.franchisorId) {
            return NextResponse.json({ error: 'Location or franchisor not found' }, { status: 404 })
        }

        // Get brand services (globalService not in main schema — any-cast)
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

        // Get overrides for this location (locationServiceOverride not in main schema)
        const overrides = await prisma.locationServiceOverride.findMany({
            where: { locationId }
        })

        const overrideMap = new Map(
            overrides.map((o: any) => [o.globalServiceId, o])
        )

        // Resolve each service
        const resolvedServices = (brandServices as any[]).map((brand: any) => ({
            ...resolveService(brand as any, overrideMap.get(brand.id) as any),
            category: brand.category
        }))

        // Filter out disabled services
        const enabledServices = resolvedServices.filter((s: any) => s.isEnabled)

        return NextResponse.json({
            services: enabledServices,
            totalBrandServices: brandServices.length,
            totalOverrides: overrides.length,
            canCustomizePricing: location.canCustomizePricing // Permission flag
        })

    } catch (error) {
        console.error('Error fetching franchise catalog:', error)
        return NextResponse.json({ error: 'Failed to fetch franchise catalog' }, { status: 500 })
    }
}
