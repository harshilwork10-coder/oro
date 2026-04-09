import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch brand catalog (categories + services) for franchisor
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchisor (via role, franchise ownership, or direct franchisor ownership)
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: {
                franchises: {
                    select: {
                        id: true,
                        franchisorId: true
                    },
                    take: 1
                }
            }
        })

        // Get franchiseId from user's franchise
        let franchiseId = user?.franchises?.[0]?.id

        if (!franchiseId) {
            // Fallback: check if user is a franchisor owner directly
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id },
                include: {
                    franchises: {
                        select: { id: true },
                        take: 1
                    }
                }
            })
            franchiseId = franchisor?.franchises?.[0]?.id
            if (!franchiseId) {
                return NextResponse.json({ error: 'No franchise found for user' }, { status: 403 })
            }
        }

        return await fetchCatalog(franchiseId)

    } catch (error) {
        console.error('Error fetching brand catalog:', error)
        return NextResponse.json({ error: 'Failed to fetch brand catalog' }, { status: 500 })
    }
}

async function fetchCatalog(franchiseId: string) {
    // Fetch services for this franchise with their categories
    const services = await prisma.service.findMany({
        where: {
            franchiseId,
            isActive: true
        },
        include: {
            serviceCategory: {
                select: { id: true, name: true }
            }
        },
        orderBy: { name: 'asc' }
    }) as any[]

    // Fetch categories for this franchise
    const categories = await prisma.serviceCategory.findMany({
        where: { franchiseId },
        include: {
            services: {
                where: { isActive: true },
                orderBy: { name: 'asc' }
            }
        },
        orderBy: { name: 'asc' }
    }) as any[]

    // Get uncategorized services
    const uncategorizedServices = services.filter(s => !s.serviceCategoryId)

    return NextResponse.json({
        categories,
        uncategorizedServices: uncategorizedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            basePrice: s.price,
            priceMode: 'FIXED',
            commissionable: true,
            isAddOn: s.isAddOn,
            isActive: s.isActive,
            category: s.serviceCategory
        })),
        totalServices: services.length
    })
}

// POST: Create new brand service
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchise
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: {
                franchises: {
                    select: { id: true },
                    take: 1
                }
            }
        })

        let franchiseId = user?.franchises?.[0]?.id
        if (!franchiseId) {
            // Fallback: franchisor owner
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id },
                include: { franchises: { select: { id: true }, take: 1 } }
            })
            franchiseId = franchisor?.franchises?.[0]?.id
        }
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 403 })
        }

        const body = await req.json()
        const {
            name,
            description,
            duration,
            basePrice,
            categoryId,
            commissionable = true,
            isAddOn = false
        } = body

        if (!name || !duration || basePrice === undefined) {
            return NextResponse.json({ error: 'Name, duration, and basePrice are required' }, { status: 400 })
        }

        const service = await prisma.service.create({
            data: {
                franchiseId,
                name,
                description,
                duration: parseInt(duration),
                price: basePrice,
                serviceCategoryId: categoryId || null,
                isActive: true,
                isAddOn
            }
        })

        return NextResponse.json({ service }, { status: 201 })

    } catch (error) {
        console.error('Error creating brand service:', error)
        return NextResponse.json({ error: 'Failed to create brand service' }, { status: 500 })
    }
}
