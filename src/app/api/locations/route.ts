import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSetupCode } from '@/lib/setup-code'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let whereClause = {}

        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: session.user.id },
                include: { franchises: true }
            })

            if (!franchisor) {
                return NextResponse.json([])
            }

            // Auto-create a default "store brand" if owner doesn't have any franchises yet
            let defaultFranchise = franchisor.franchises[0]
            if (!defaultFranchise) {
                // Create a default store brand using the business name
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
                where: {
                    franchise: {
                        franchisorId: franchisor.id
                    }
                }
            })

            if (existingLocations === 0) {
                // Create the first store automatically
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
                        setupCode: generateSetupCode(storeName) // Auto-generate terminal setup code
                    }
                })
            }

            whereClause = {
                franchise: {
                    franchisorId: franchisor.id
                }
            }
        }

        const locations = await prisma.location.findMany({
            where: whereClause,
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        users: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(locations)
    } catch (error) {
        console.error('Error fetching locations:', error)
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, address, franchiseId } = body

        if (!name || !address) {
            return NextResponse.json({ error: 'Name and address are required' }, { status: 400 })
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
                return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 403 })
            }

            // Check location limit based on subscription
            const currentLocationCount = await prisma.location.count({
                where: { franchise: { franchisorId: franchisor.id } }
            })
            const maxLocations = franchisor.config?.maxLocations || 1

            if (currentLocationCount >= maxLocations) {
                return NextResponse.json({
                    error: 'Location limit reached',
                    message: `Your ${franchisor.config?.subscriptionTier || 'STARTER'} plan allows ${maxLocations} store(s). Upgrade to add more.`,
                    code: 'LIMIT_REACHED',
                    current: currentLocationCount,
                    limit: maxLocations
                }, { status: 403 })
            }

            if (franchiseId) {
                // Verify they own this franchise
                const ownsFranchise = franchisor.franchises.some(f => f.id === franchiseId)
                if (!ownsFranchise) {
                    return NextResponse.json({ error: 'You do not own this franchise' }, { status: 403 })
                }
            } else {
                // Auto-assign if they only have one franchise
                if (franchisor.franchises.length === 1) {
                    finalFranchiseId = franchisor.franchises[0].id
                } else if (franchisor.franchises.length > 1) {
                    return NextResponse.json({ error: 'Please select a franchise' }, { status: 400 })
                } else {
                    return NextResponse.json({ error: 'You do not have any franchises created yet' }, { status: 400 })
                }
            }
        }

        const location = await prisma.location.create({
            data: {
                name,
                slug: uniqueSlug,
                address,
                franchiseId: finalFranchiseId || null, // null for direct-owned locations (Provider only)
                setupCode: generateSetupCode(name) // Auto-generate terminal setup code
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        })

        return NextResponse.json(location, { status: 201 })
    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
