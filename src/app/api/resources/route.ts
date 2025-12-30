import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List resources for a location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // CHAIR, ROOM, EQUIPMENT

        if (!locationId) {
            return NextResponse.json({ error: 'No location associated' }, { status: 400 })
        }

        const resources = await prisma.resource.findMany({
            where: {
                locationId,
                ...(type && { type }),
                isActive: true
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        })

        return NextResponse.json(resources)
    } catch (error) {
        console.error('Error fetching resources:', error)
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }
}

// POST - Create a new resource
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId

        // Check permissions - need to be manager/owner
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        if (!locationId) {
            return NextResponse.json({ error: 'No location associated' }, { status: 400 })
        }

        const body = await request.json()
        const { name, type, description, capacity, allowedServiceIds, sortOrder } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const resource = await prisma.resource.create({
            data: {
                locationId,
                name,
                type: type || 'CHAIR',
                description,
                capacity: capacity ? parseInt(capacity) : 1,
                allowedServiceIds,
                sortOrder: sortOrder ? parseInt(sortOrder) : 0
            }
        })

        return NextResponse.json(resource, { status: 201 })
    } catch (error) {
        console.error('Error creating resource:', error)
        return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }
}

// PUT - Update a resource
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId

        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const { id, name, type, description, capacity, allowedServiceIds, sortOrder, isActive } = body

        if (!id) {
            return NextResponse.json({ error: 'Resource ID required' }, { status: 400 })
        }

        // Verify resource belongs to this location
        const existing = await prisma.resource.findFirst({
            where: { id, locationId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
        }

        const updated = await prisma.resource.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(description !== undefined && { description }),
                ...(capacity && { capacity: parseInt(capacity) }),
                ...(allowedServiceIds !== undefined && { allowedServiceIds }),
                ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
                ...(isActive !== undefined && { isActive })
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating resource:', error)
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
    }
}

// DELETE - Remove a resource
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const locationId = user.locationId
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        if (!id) {
            return NextResponse.json({ error: 'Resource ID required' }, { status: 400 })
        }

        // Verify resource belongs to this location
        const existing = await prisma.resource.findFirst({
            where: { id, locationId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
        }

        // Soft delete
        await prisma.resource.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting resource:', error)
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
    }
}

