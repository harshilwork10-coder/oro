import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get brand + all published booking locations for a franchise slug
// Used by the public booking page when >3 locations exist (brand landing mode)
// and by the /book/[slug] page to load location data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')

        if (!slug) {
            return NextResponse.json({ error: 'Franchise slug required' }, { status: 400 })
        }

        // Find franchise by slug
        const franchise = await prisma.franchise.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                franchisorId: true,
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        // Get franchisor brand info (logo, colors, description)
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchise.franchisorId },
            select: {
                name: true,
                businessType: true,
                logoUrl: true,
                brandColorPrimary: true,
                brandColorSecondary: true,
                phone: true,
            }
        })

        // Get all locations with published booking profiles
        const locations = await prisma.location.findMany({
            where: { franchiseId: franchise.id },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                timezone: true,
                latitude: true,
                longitude: true,
                publicPhone: true,
                operatingHours: true,
                bookingProfile: {
                    select: {
                        isPublished: true,
                        accentColor: true,
                        welcomeMessage: true,
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Separate published vs draft locations
        const published = locations.filter(l => l.bookingProfile?.isPublished)
        const allLocations = locations.map(l => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            address: l.address,
            timezone: l.timezone,
            lat: l.latitude,
            lng: l.longitude,
            phone: l.publicPhone,
            hours: l.operatingHours ? (() => { try { return JSON.parse(l.operatingHours!) } catch { return null } })() : null,
            isPublished: l.bookingProfile?.isPublished || false,
        }))

        return NextResponse.json({
            brand: {
                name: franchisor?.name || franchise.name,
                slug: franchise.slug,
                businessType: franchisor?.businessType || 'MULTI_LOCATION_OWNER',
                logo: franchisor?.logoUrl || null,
                primaryColor: franchisor?.brandColorPrimary || '#7C3AED',
                secondaryColor: franchisor?.brandColorSecondary || null,
                phone: franchisor?.phone || null,
            },
            locations: allLocations,
            publishedCount: published.length,
            totalCount: locations.length,
        })
    } catch (error) {
        console.error('Error fetching brand locations:', error)
        return NextResponse.json({ error: 'Failed to fetch brand locations' }, { status: 500 })
    }
}
