import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await getAuthUser(request)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: authUser.email },
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
                categoryId: category  // category is the ID passed from frontend
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
    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: authUser.email },
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
