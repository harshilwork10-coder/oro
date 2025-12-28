import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Public deals feed (no auth required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = parseFloat(searchParams.get('lat') || '0')
        const lng = parseFloat(searchParams.get('lng') || '0')
        const type = searchParams.get('type') // Business type filter
        const limit = parseInt(searchParams.get('limit') || '20')

        const now = new Date()

        // Get active promotions from stores in directory
        const promotions = await prisma.promotion.findMany({
            where: {
                isActive: true,
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ],
                franchise: {
                    locations: {
                        some: {
                            showInDirectory: true,
                            ...(type && { businessType: type })
                        }
                    }
                }
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        settings: {
                            select: {
                                storeLogo: true,
                                storeDisplayName: true
                            }
                        },
                        locations: {
                            where: { showInDirectory: true },
                            select: {
                                id: true,
                                publicName: true,
                                name: true,
                                address: true,
                                latitude: true,
                                longitude: true,
                                businessType: true,
                                publicLogoUrl: true
                            },
                            take: 1
                        }
                    }
                },
                qualifyingItems: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                price: true
                            }
                        }
                    },
                    take: 3
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        })

        // Format deals with store info and distance
        const deals = promotions.map(promo => {
            const location = promo.franchise.locations[0]
            let distance = null

            if (lat && lng && location?.latitude && location?.longitude) {
                distance = calculateDistance(lat, lng, location.latitude, location.longitude)
            }

            return {
                id: promo.id,
                name: promo.name,
                description: promo.description,
                type: promo.type,
                discountType: promo.discountType,
                discountValue: Number(promo.discountValue),
                endDate: promo.endDate,
                store: {
                    id: location?.id,
                    name: location?.publicName || location?.name || promo.franchise.name,
                    address: location?.address,
                    type: location?.businessType,
                    logo: location?.publicLogoUrl || promo.franchise.settings?.storeLogo,
                    distance
                },
                products: promo.qualifyingItems
                    .filter(qi => qi.product)
                    .map(qi => ({
                        name: qi.product!.name,
                        originalPrice: Number(qi.product!.price),
                        salePrice: promo.discountType === 'PERCENT'
                            ? Number(qi.product!.price) * (1 - Number(promo.discountValue) / 100)
                            : Math.max(0, Number(qi.product!.price) - Number(promo.discountValue))
                    }))
            }
        })

        // Sort by distance if location provided
        if (lat && lng) {
            deals.sort((a, b) => (a.store.distance || 999) - (b.store.distance || 999))
        }

        return NextResponse.json({
            deals,
            count: deals.length
        })
    } catch (error) {
        console.error('Deals feed error:', error)
        return NextResponse.json({ deals: [], count: 0 })
    }
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
