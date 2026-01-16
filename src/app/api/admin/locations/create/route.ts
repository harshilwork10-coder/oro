import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST create new location for a franchisor (Provider only)
// This endpoint accepts franchisorId and auto-creates franchise if needed
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        const { franchisorId, name, address } = body

        if (!name || !franchisorId) {
            return NextResponse.json({ error: 'Name and franchisorId are required' }, { status: 400 })
        }

        // Verify the franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: {
                franchises: {
                    take: 1 // Get the first franchise if exists
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get or create a franchise for this franchisor
        let franchiseId: string

        if (franchisor.franchises.length > 0) {
            // Use existing franchise
            franchiseId = franchisor.franchises[0].id
        } else {
            // Create a new franchise for this franchisor
            const franchise = await prisma.franchise.create({
                data: {
                    name: franchisor.name,
                    slug: `${franchisor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
                    franchisorId: franchisor.id
                }
            })
            franchiseId = franchise.id
        }

        // Create slug from location name
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        // Create the location
        const location = await prisma.location.create({
            data: {
                name,
                address: address || null,
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

        return NextResponse.json({
            location,
            message: 'Location created successfully'
        })
    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
