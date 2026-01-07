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

        // Find franchise by slug
        const franchise = await prisma.franchise.findUnique({
            where: { slug },
            include: {
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        // Get services
        const services = await prisma.service.findMany({
            where: { franchiseId: franchise.id },
            orderBy: { name: 'asc' },
            include: {
                serviceCategory: { select: { name: true } }
            }
        })

        // Get staff who can take appointments
        const staff = await prisma.user.findMany({
            where: {
                franchiseId: franchise.id,
                role: { in: ['EMPLOYEE', 'MANAGER'] }
            },
            select: {
                id: true,
                name: true,
                image: true
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
            locations: franchise.locations,
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

