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

        // Resolve franchisor and get ALL their franchise IDs
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: authUser.id },
            include: {
                franchises: {
                    select: { id: true }
                }
            }
        })

        if (!franchisor) {
            // Fallback: franchise employee viewing — read from legacy ServiceCategory
            const user = await prisma.user.findUnique({
                where: { id: authUser.id },
                select: { franchiseId: true }
            })
            if (!user?.franchiseId) {
                return NextResponse.json({ error: 'No franchise found for user' }, { status: 403 })
            }
            return await fetchFranchiseCatalog([user.franchiseId])
        }

        const franchiseIds = franchisor.franchises.map(f => f.id)
        if (franchiseIds.length === 0) {
            return NextResponse.json({ success: true, data: { categories: [], uncategorizedServices: [], totalServices: 0 } })
        }

        // Brand owner path — read from GlobalServiceCategory (matches POST write table)
        return await fetchBrandCatalog(franchisor.id, franchiseIds)

    } catch (error) {
        console.error('Error fetching brand catalog:', error)
        return NextResponse.json({ error: 'Failed to fetch brand catalog' }, { status: 500 })
    }
}

// Brand HQ path: reads from GlobalServiceCategory + GlobalService (franchisor-scoped)
async function fetchBrandCatalog(franchisorId: string, franchiseIds: string[]) {
    // Fetch brand-level categories from GlobalServiceCategory (same table POST writes to)
    const brandCategories = await prisma.globalServiceCategory.findMany({
        where: { franchisorId, isActive: true },
        include: {
            services: {
                where: { isActive: true, isArchived: false },
                orderBy: { name: 'asc' }
            }
        },
        orderBy: { sortOrder: 'asc' }
    })

    // Shape categories + embedded services to match BrandCategory / BrandService interface
    const categories = brandCategories.map(c => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        services: c.services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            basePrice: s.basePrice,
            priceMode: s.priceMode,
            tierShortPrice: s.tierShortPrice,
            tierMediumPrice: s.tierMediumPrice,
            tierLongPrice: s.tierLongPrice,
            commissionable: s.commissionable,
            taxTreatmentOverride: s.taxTreatmentOverride,
            isAddOn: s.isAddOn,
            isActive: s.isActive,
            categoryId: c.id,
            category: { id: c.id, name: c.name }
        }))
    }))

    // Fetch uncategorized brand services (GlobalService with no categoryId)
    const uncategorizedGlobal = await prisma.globalService.findMany({
        where: {
            franchisorId,
            isActive: true,
            isArchived: false,
            categoryId: null
        },
        orderBy: { name: 'asc' }
    })

    const uncategorizedServices = uncategorizedGlobal.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        basePrice: s.basePrice,
        priceMode: s.priceMode,
        tierShortPrice: s.tierShortPrice,
        tierMediumPrice: s.tierMediumPrice,
        tierLongPrice: s.tierLongPrice,
        commissionable: s.commissionable,
        taxTreatmentOverride: s.taxTreatmentOverride,
        isAddOn: s.isAddOn,
        isActive: s.isActive,
        categoryId: null,
        category: null
    }))

    const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0) + uncategorizedServices.length

    return NextResponse.json({
        success: true,
        data: { categories, uncategorizedServices, totalServices }
    })
}

// Franchise employee fallback: reads from legacy ServiceCategory (unchanged behavior)
async function fetchFranchiseCatalog(franchiseIds: string[]) {
    const services = await prisma.service.findMany({
        where: { franchiseId: { in: franchiseIds } },
        include: {
            serviceCategory: { select: { id: true, name: true } },
            franchise: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
    }) as any[]

    const categories = await prisma.serviceCategory.findMany({
        where: { franchiseId: { in: franchiseIds } },
        include: {
            services: { orderBy: { name: 'asc' } },
            franchise: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
    }) as any[]

    const uncategorizedServices = services.filter(s => !s.categoryId)

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
            category: s.serviceCategory,
            franchise: s.franchise
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

        // Resolve franchise via franchisor ownership
        let franchiseId: string | undefined

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: authUser.id },
            include: { franchises: { select: { id: true }, take: 1 } }
        })
        franchiseId = franchisor?.franchises?.[0]?.id

        if (!franchiseId) {
            // Fallback: user directly on a franchise
            const user = await prisma.user.findUnique({
                where: { id: authUser.id },
                select: { franchiseId: true }
            })
            franchiseId = user?.franchiseId ?? undefined
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
                categoryId: categoryId || null,
                isAddOn
            }
        })

        return NextResponse.json({ service }, { status: 201 })

    } catch (error) {
        console.error('Error creating brand service:', error)
        return NextResponse.json({ error: 'Failed to create brand service' }, { status: 500 })
    }
}
