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
        include: { location: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const items = await prisma.product.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(items)
    } catch (error) {
        console.error('Error fetching products:', error)
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
        include: { location: true }
    })

    if (!user?.locationId) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { name, sku, price, stock, description } = body

        if (!name || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const item = await prisma.product.create({
            data: {
                name,
                sku,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                description,
                category: 'RETAIL',
                // type: 'PRODUCT', // Removed as not in schema
                franchiseId: user.franchiseId!, // Use franchiseId
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error creating product:', error)
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
        include: { location: true }
    })

    if (!user?.locationId) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { id, name, sku, price, stock, description } = body

        if (!id || !name || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const item = await prisma.product.updateMany({
            where: {
                id,
                franchiseId: user.franchiseId!
            },
            data: {
                name,
                sku,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                description,
            }
        })

        if (item.count === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating product:', error)
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
        include: { location: true }
    })

    if (!user?.locationId) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing product ID' }, { status: 400 })
        }

        const item = await prisma.product.deleteMany({
            where: {
                id,
                franchiseId: user.franchiseId!
            }
        })

        if (item.count === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
