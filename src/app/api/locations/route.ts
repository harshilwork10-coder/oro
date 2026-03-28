import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { generateSetupCode } from '@/lib/setup-code'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')

        let whereClause: Record<string, unknown> = {}

        // Handle different roles
        const dashboardRoles = ['OWNER', 'MANAGER', 'EMPLOYEE', 'FRANCHISEE']
        if (dashboardRoles.includes(user.role as string)) {
            // For dashboard users: use session data first, then query if needed
            if (user.franchiseId) {
                whereClause = { franchiseId: user.franchiseId }
            } else if (user.locationId) {
                // Get location to find its franchise
                const location = await prisma.location.findUnique({
                    where: { id: user.locationId as string },
                    select: { franchiseId: true }
                })
                if (location?.franchiseId) {
                    whereClause = { franchiseId: location.franchiseId }
                } else {
                    whereClause = { id: user.locationId as string }
                }
            } else {
                // Fallback: query user record for franchiseId
                if (user?.franchiseId) {
                    whereClause = { franchiseId: user.franchiseId }
                } else if (user?.locationId) {
                    whereClause = { id: user.locationId }
                } else {
                    return NextResponse.json({ data: [], pagination: { hasMore: false, nextCursor: null } })
                }
            }
        } else if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: true }
            })

            if (!franchisor) {
                return NextResponse.json({ data: [], pagination: { hasMore: false, nextCursor: null } })
            }

            // Auto-create a default "store brand" if owner doesn't have any franchises yet
            let defaultFranchise = franchisor.franchises[0]
            if (!defaultFranchise) {
                const slug = (franchisor.name || 'store').toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')

                defaultFranchise = await prisma.franchise.create({
                    data: {
                        name: franchisor.name || 'My Store',
                        slug: `${slug}-${Date.now()}`,
                        franchisorId: franchisor.id
                    }
                })
            }

            // Auto-create first location if owner doesn't have any stores yet
            const existingLocations = await prisma.location.count({
                where: { franchise: { franchisorId: franchisor.id } }
            })

            if (existingLocations === 0) {
                const storeName = franchisor.name || 'My First Store'
                const storeSlug = storeName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')

                await prisma.location.create({
                    data: {
                        name: storeName,
                        slug: `${storeSlug}-${Date.now()}`,
                        address: 'Please update your store address',
                        franchiseId: defaultFranchise.id,
                        setupCode: generateSetupCode(storeName)
                    }
                })
            }

            whereClause = { franchise: { franchisorId: franchisor.id } }
        } else if (user.role !== 'PROVIDER') {
            // Any other role that isn't PROVIDER can't access
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Add search filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { address: { contains: search } }
            ]
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                franchise: { select: { id: true, name: true } },
                _count: { select: { users: true } }
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const locations = await prisma.location.findMany(
            queryArgs as Parameters<typeof prisma.location.findMany>[0]
        )

        const hasMore = locations.length > (take || 50)
        const data = hasMore ? locations.slice(0, take || 50) : locations
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Error fetching locations:', error)
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (user.role !== 'PROVIDER' && user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name, address, franchiseId } = body

        if (!name || !address) {
            return NextResponse.json({ error: 'Name and address are required' }, { status: 422 })
        }

        // Generate slug
        let slug = name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '')

        // Ensure uniqueness
        let uniqueSlug = slug
        let counter = 1
        while (await prisma.location.findUnique({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${slug}-${counter}`
            counter++
        }

        let finalFranchiseId = franchiseId

        // For Franchisors, validate ownership or auto-assign
        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: {
                    franchises: true,
                    config: { select: { maxLocations: true, subscriptionTier: true } }
                }
            })

            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 403 })
            }

            // Check location limit based on subscription (default to 10 for development)
            const currentLocationCount = await prisma.location.count({
                where: { franchise: { franchisorId: franchisor.id } }
            })
            const maxLocations = franchisor.config?.maxLocations || 10

            if (currentLocationCount >= maxLocations) {
                return NextResponse.json(
                    { error: `Location limit reached (${currentLocationCount}/${maxLocations}). Your ${franchisor.config?.subscriptionTier || 'STARTER'} plan allows ${maxLocations} store(s). Contact support to upgrade.` },
                    { status: 403 }
                )
            }

            if (franchiseId) {
                const ownsFranchise = franchisor.franchises.some(f => f.id === franchiseId)
                if (!ownsFranchise) {
                    return NextResponse.json({ error: 'You do not own this franchise' }, { status: 403 })
                }
            } else {
                if (franchisor.franchises.length === 1) {
                    finalFranchiseId = franchisor.franchises[0].id
                } else if (franchisor.franchises.length > 1) {
                    return NextResponse.json({ error: 'Please select a franchise' }, { status: 422 })
                } else {
                    return NextResponse.json({ error: 'You do not have any franchises created yet' }, { status: 422 })
                }
            }
        }

        const location = await prisma.location.create({
            data: {
                name,
                slug: uniqueSlug,
                address,
                franchiseId: finalFranchiseId || null,
                setupCode: generateSetupCode(name)
            },
            include: {
                franchise: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(location, { status: 201 })
    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
