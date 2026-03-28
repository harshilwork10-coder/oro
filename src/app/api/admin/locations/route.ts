import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET all locations across all franchisors (for Provider)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const franchisorId = searchParams.get('franchisorId')

        // Build filter - get all locations with a franchise
        // If franchisorId provided, filter to that specific franchisor
        let whereClause: any = {}

        if (franchisorId) {
            whereClause = {
                franchise: {
                    franchisorId: franchisorId
                }
            }
        }
        // No filter - get all locations

        const locations = await prisma.location.findMany({
            where: whereClause,
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisorId: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true,
                                owner: {
                                    select: {
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        users: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ locations })
    } catch (error) {
        console.error('Error fetching locations:', error)
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

// POST create new location for a franchise (Provider only)
export async function POST(req: NextRequest) {
    try {
        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await req.json()
        const { name, address, franchiseId } = body

        if (!name || !franchiseId) {
            return NextResponse.json({ error: 'Name and franchise are required' }, { status: 400 })
        }

        // Verify the franchise exists and has a valid franchisor
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            include: {
                franchisor: true
            }
        })

        if (!franchise || !franchise.franchisorId) {
            return NextResponse.json({ error: 'Invalid franchise' }, { status: 400 })
        }

        // Create slug from name
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        const location = await prisma.location.create({
            data: {
                name,
                address: address || '',
                slug: `${baseSlug}-${Date.now()}`,
                franchiseId
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json({ location, message: 'Location created successfully' })
    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
