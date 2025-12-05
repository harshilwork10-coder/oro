import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
        let whereClause: any = {}

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id }
            })
            if (!franchisor) return NextResponse.json([])

            // Get all services in franchises owned by this franchisor
            whereClause.franchise = {
                franchisorId: franchisor.id
            }
        } else if (user.franchiseId) {
            whereClause.franchiseId = user.franchiseId
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const services = await prisma.service.findMany({
            where: whereClause,
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(services)
    } catch (error) {
        console.error('Error fetching services:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { name, description, duration, price, category, categoryId, franchiseId } = body

        if (!name || !price || !duration) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        let finalFranchiseId = franchiseId || user.franchiseId

        // For Franchisors, validate franchise ownership or auto-assign
        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: true }
            })

            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 403 })
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
        } else if (!finalFranchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        const service = await prisma.service.create({
            data: {
                name,
                description,
                duration: parseInt(duration),
                price: parseFloat(price),
                category,
                categoryId: categoryId || null,
                franchiseId: finalFranchiseId,
            },
            include: { serviceCategory: true }
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error('Error creating service:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { id, name, description, duration, price, category, categoryId } = body

        if (!id || !name || !price || !duration) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const service = await prisma.service.updateMany({
            where: {
                id,
                franchiseId: user.franchiseId // Security: can only update own franchise services
            },
            data: {
                name,
                description,
                duration: parseInt(duration),
                price: parseFloat(price),
                category,
                categoryId: categoryId || null,
            }
        })

        if (service.count === 0) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating service:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing service ID' }, { status: 400 })
        }

        const service = await prisma.service.deleteMany({
            where: {
                id,
                franchiseId: user.franchiseId // Security: can only delete own franchise services
            }
        })

        if (service.count === 0) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting service:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
