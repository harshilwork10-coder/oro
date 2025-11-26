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

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const services = await prisma.service.findMany({
            where: { franchiseId: user.franchiseId },
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

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { name, description, duration, price, category, categoryId } = body

        if (!name || !price || !duration) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const service = await prisma.service.create({
            data: {
                name,
                description,
                duration: parseInt(duration),
                price: parseFloat(price),
                category,
                categoryId: categoryId || null,
                franchiseId: user.franchiseId,
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
