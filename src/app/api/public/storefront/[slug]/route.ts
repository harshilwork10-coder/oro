import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/storefront/[slug] — Store info for storefront landing page
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const location = await prisma.location.findFirst({
            where: { slug: params.slug },
            include: {
                storefrontProfile: true,
                franchise: {
                    include: {
                        franchisor: {
                            include: { config: { select: { usesStorefront: true } } }
                        }
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Check storefront is enabled
        const featureEnabled = location.franchise?.franchisor?.config?.usesStorefront
        if (!featureEnabled || !location.storefrontProfile?.isEnabled) {
            return NextResponse.json({ error: 'Store not available' }, { status: 404 })
        }

        const profile = location.storefrontProfile

        return NextResponse.json({
            store: {
                name: location.publicName || location.name,
                slug: location.slug,
                headline: profile.headline,
                address: location.address,
                phone: location.publicPhone,
                bannerImageUrl: profile.bannerImageUrl || location.publicBannerUrl,
                logoUrl: location.publicLogoUrl,
                latitude: location.latitude,
                longitude: location.longitude,
                operatingHours: location.operatingHours ? JSON.parse(location.operatingHours) : null,
                timezone: location.timezone,
                businessType: location.businessType,
            },
            pickup: {
                enabled: profile.pickupEnabled,
                leadMinutes: profile.pickupLeadMinutes,
                maxOrdersPerSlot: profile.maxOrdersPerSlot,
            },
            order: {
                minAmount: profile.minOrderAmount,
                maxItems: profile.maxItemsPerOrder,
                notesEnabled: profile.orderNotesEnabled,
            }
        })
    } catch (error) {
        console.error('[STOREFRONT_GET]', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
