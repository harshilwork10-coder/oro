import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Public endpoint for store discovery (no auth required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = parseFloat(searchParams.get('lat') || '0')
        const lng = parseFloat(searchParams.get('lng') || '0')
        const radius = parseFloat(searchParams.get('radius') || '25') // miles
        const type = searchParams.get('type') // RESTAURANT, RETAIL, SALON, etc.
        const limit = parseInt(searchParams.get('limit') || '50')

        // Get all stores that opted-in to directory
        const stores = await prisma.location.findMany({
            where: {
                showInDirectory: true,
                ...(type && { businessType: type })
            },
            select: {
                id: true,
                name: true,
                publicName: true,
                publicDescription: true,
                publicPhone: true,
                address: true,
                businessType: true,
                latitude: true,
                longitude: true,
                operatingHours: true,
                publicLogoUrl: true,
                publicBannerUrl: true,
                franchise: {
                    select: {
                        name: true,
                        settings: {
                            select: {
                                storeLogo: true,
                                storeDisplayName: true
                            }
                        }
                    }
                }
            },
            take: limit
        })

        // Calculate distance and filter by radius if coordinates provided
        const storesWithDistance = stores.map(store => {
            let distance = null
            if (lat && lng && store.latitude && store.longitude) {
                distance = calculateDistance(lat, lng, store.latitude, store.longitude)
            }

            return {
                id: store.id,
                name: store.publicName || store.name,
                description: store.publicDescription,
                phone: store.publicPhone,
                address: store.address,
                type: store.businessType,
                latitude: store.latitude,
                longitude: store.longitude,
                hours: store.operatingHours ? JSON.parse(store.operatingHours) : null,
                logo: store.publicLogoUrl || store.franchise?.settings?.storeLogo,
                banner: store.publicBannerUrl,
                franchiseName: store.franchise?.name,
                distance: distance ? Math.round(distance * 10) / 10 : null
            }
        })

        // Filter by radius and sort by distance
        let filteredStores = storesWithDistance
        if (lat && lng) {
            filteredStores = storesWithDistance
                .filter(s => s.distance === null || s.distance <= radius)
                .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        }

        // NOTE: Promotion model not implemented - deals count disabled
        // TODO: Re-enable when Promotion model is added to schema

        // Map deals count to stores (returning 0 since Promotion model doesn't exist)
        const storesWithDeals = filteredStores.map(store => ({
            ...store,
            dealsCount: 0
        }))

        return NextResponse.json({
            stores: storesWithDeals,
            count: storesWithDeals.length,
            hasLocation: !!(lat && lng)
        })
    } catch (error) {
        console.error('Store discovery error:', error)
        return NextResponse.json({ stores: [], count: 0, error: 'Failed to fetch stores' })
    }
}

// Haversine formula for distance calculation (miles)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180)
}

