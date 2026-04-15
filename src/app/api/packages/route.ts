import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - List service packages for a franchise
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
const franchiseId = user.franchiseId

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const packages = await prisma.servicePackage.findMany({
            where: { franchiseId },
            include: {
                service: {
                    select: { id: true, name: true, price: true, duration: true }
                },
                _count: {
                    select: { purchases: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(packages)
    } catch (error) {
        console.error('Error fetching packages:', error)
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }
}

// POST - Create a new service package
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
const franchiseId = user.franchiseId

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const body = await req.json()
        const { name, description, serviceId, sessionsIncluded, price, validityDays } = body

        if (!name || !serviceId || !sessionsIncluded || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify service belongs to this franchise
        const service = await prisma.service.findFirst({
            where: { id: serviceId, franchiseId }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        const newPackage = await prisma.servicePackage.create({
            data: {
                franchiseId,
                name,
                description,
                serviceId,
                sessionsIncluded: parseInt(sessionsIncluded),
                price: parseFloat(price),
                validityDays: validityDays ? parseInt(validityDays) : 365
            },
            include: {
                service: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(newPackage, { status: 201 })
    } catch (error) {
        console.error('Error creating package:', error)
        return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
    }
}

// PUT - Update a service package
export async function PUT(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
const franchiseId = user.franchiseId

        const body = await req.json()
        const { id, name, description, sessionsIncluded, price, validityDays, isActive } = body

        if (!id) {
            return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
        }

        // Verify package belongs to this franchise
        const existing = await prisma.servicePackage.findFirst({
            where: { id, franchiseId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        const updated = await prisma.servicePackage.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(sessionsIncluded && { sessionsIncluded: parseInt(sessionsIncluded) }),
                ...(price && { price: parseFloat(price) }),
                ...(validityDays && { validityDays: parseInt(validityDays) }),
                ...(isActive !== undefined && { isActive })
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating package:', error)
        return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
    }
}

// DELETE - Deactivate a package (soft delete)
export async function DELETE(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
const franchiseId = user.franchiseId
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
        }

        // Verify package belongs to this franchise
        const existing = await prisma.servicePackage.findFirst({
            where: { id, franchiseId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        // Soft delete - just deactivate
        await prisma.servicePackage.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting package:', error)
        return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
    }
}

