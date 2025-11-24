import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { name, description, duration, price, category } = body
        const { id } = await params

        // Verify ownership
        const existingService = await prisma.service.findUnique({
            where: { id }
        })

        if (!existingService || existingService.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Service not found or unauthorized' }, { status: 404 })
        }

        const service = await prisma.service.update({
            where: { id },
            data: {
                name,
                description,
                duration: parseInt(duration),
                price: parseFloat(price),
                category
            }
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error('Error updating service:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params
        // Verify ownership
        const existingService = await prisma.service.findUnique({
            where: { id }
        })

        if (!existingService || existingService.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Service not found or unauthorized' }, { status: 404 })
        }

        await prisma.service.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting service:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
