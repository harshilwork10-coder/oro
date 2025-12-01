import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get all locations for a client
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get the franchisor ID for this user
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get all franchises (locations) for this franchisor
        const locations = await prisma.franchise.findMany({
            where: {
                franchisorId: franchisor.id
            },
            select: {
                id: true,
                name: true,
                slug: true,
                createdAt: true,
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        slug: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        transactions: true
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

// Create new location
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, address, phone, city, state, zip } = await request.json()

        if (!name || !address) {
            return NextResponse.json({ error: 'Name and address required' }, { status: 400 })
        }

        // Get the franchisor
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true, name: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Create slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`

        // Check if this is the first location (create franchise) or additional location
        let franchise = await prisma.franchise.findFirst({
            where: { franchisorId: franchisor.id }
        })

        if (!franchise) {
            // First location - create franchise AND location
            franchise = await prisma.franchise.create({
                data: {
                    name: franchisor.name,
                    slug: `${franchisor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
                    franchisorId: franchisor.id
                }
            })
        }

        // Create the location
        const location = await prisma.location.create({
            data: {
                name,
                slug: uniqueSlug,
                address: `${address}, ${city || ''}, ${state || ''} ${zip || ''}`.trim(),
                franchiseId: franchise.id
            }
        })

        return NextResponse.json({
            success: true,
            location,
            franchise
        })
    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
