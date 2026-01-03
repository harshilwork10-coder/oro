import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSetupCode } from '@/lib/setup-code'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')

        let whereClause: Record<string, unknown> = {}

        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: session.user.id },
                include: { franchises: true }
            })

            if (!franchisor) {
                return ApiResponse.success({ data: [], pagination: { hasMore: false, nextCursor: null } })
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

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Error fetching locations:', error)
        return ApiResponse.serverError('Failed to fetch locations')
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return ApiResponse.unauthorized()
        }

        const body = await request.json()
        const { name, address, franchiseId } = body

        if (!name || !address) {
            return ApiResponse.validationError('Name and address are required')
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
        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: session.user.id },
                include: {
                    franchises: true,
                    config: { select: { maxLocations: true, subscriptionTier: true } }
                }
            })

            if (!franchisor) {
                return ApiResponse.forbidden('Franchisor profile not found')
            }

            // Check location limit based on subscription
            const currentLocationCount = await prisma.location.count({
                where: { franchise: { franchisorId: franchisor.id } }
            })
            const maxLocations = franchisor.config?.maxLocations || 1

            if (currentLocationCount >= maxLocations) {
                return ApiResponse.error(
                    `Location limit reached. Your ${franchisor.config?.subscriptionTier || 'STARTER'} plan allows ${maxLocations} store(s). Upgrade to add more.`,
                    403,
                    { code: 'LIMIT_REACHED', details: { current: currentLocationCount, limit: maxLocations } }
                )
            }

            if (franchiseId) {
                const ownsFranchise = franchisor.franchises.some(f => f.id === franchiseId)
                if (!ownsFranchise) {
                    return ApiResponse.forbidden('You do not own this franchise')
                }
            } else {
                if (franchisor.franchises.length === 1) {
                    finalFranchiseId = franchisor.franchises[0].id
                } else if (franchisor.franchises.length > 1) {
                    return ApiResponse.validationError('Please select a franchise')
                } else {
                    return ApiResponse.validationError('You do not have any franchises created yet')
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

        return ApiResponse.created(location)
    } catch (error) {
        console.error('Error creating location:', error)
        return ApiResponse.serverError('Failed to create location')
    }
}
