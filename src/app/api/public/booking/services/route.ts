import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get services for a franchise by slug
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')

        if (!slug) {
            return NextResponse.json({ error: 'Franchise slug required' }, { status: 400 })
        }

        // Find franchise by slug with settings and locations (including booking profiles)
        const franchise = await prisma.franchise.findUnique({
            where: { slug },
            include: {
                settings: {
                    select: { enableOnlineBooking: true }
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        slug: true,
                        timezone: true,
                        bookingProfile: {
                            select: { isPublished: true }
                        }
                    }
                }
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        // Enforce enableOnlineBooking — if settings exist and booking is disabled, block
        if (franchise.settings && !franchise.settings.enableOnlineBooking) {
            return NextResponse.json({ error: 'Online booking is not available for this business' }, { status: 403 })
        }

        // Enforce BookingProfile.isPublished — at least one location must have a published profile
        const publishedLocations = franchise.locations.filter(
            l => l.bookingProfile?.isPublished === true
        )
        if (publishedLocations.length === 0) {
            return NextResponse.json({ error: 'Booking is not yet available for this business' }, { status: 403 })
        }

        // Get services
        const services = await prisma.service.findMany({
            where: { franchiseId: franchise.id },
            orderBy: { name: 'asc' },
            include: {
                serviceCategory: { select: { name: true } }
            }
        })

        // Get staff who can take appointments (must be active and accepting clients)
        const staff = await prisma.user.findMany({
            where: {
                franchiseId: franchise.id,
                role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] },
                isActive: true,
                acceptingClients: true
            },
            select: {
                id: true,
                name: true,
                image: true,
                staffSlug: true,
                profilePhotoUrl: true
            }
        })

        // Separate main services from add-ons
        const mainServices = services.filter(s => !s.isAddOn)
        const addonServices = services.filter(s => s.isAddOn)

        return NextResponse.json({
            franchise: {
                id: franchise.id,
                name: franchise.name,
                slug: franchise.slug
            },
            locations: publishedLocations.map(l => ({
                id: l.id,
                name: l.name,
                address: l.address,
                slug: l.slug,
                timezone: l.timezone
            })),
            services: mainServices.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                duration: s.duration,
                price: Number(s.price),
                category: s.serviceCategory?.name || null
            })),
            addons: addonServices.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                duration: s.duration,
                price: Number(s.price),
                category: s.serviceCategory?.name || null
            })),
            staff: staff.filter(s => s.name)
        })
    } catch (error) {
        console.error('Error fetching booking data:', error)
        return NextResponse.json({ error: 'Failed to fetch booking data' }, { status: 500 })
    }
}
