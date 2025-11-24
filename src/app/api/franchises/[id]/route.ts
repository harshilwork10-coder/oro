import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const franchise = await prisma.franchise.findUnique({
            where: { id },
            include: {
                locations: true,
                users: true,
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        return NextResponse.json(franchise)
    } catch (error) {
        console.error('Error fetching franchise:', error)
        return NextResponse.json({ error: 'Failed to fetch franchise' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name } = body
        const { id } = await context.params

        const franchise = await prisma.franchise.update({
            where: { id },
            data: { name }
        })

        return NextResponse.json(franchise)
    } catch (error) {
        console.error('Error updating franchise:', error)
        return NextResponse.json({ error: 'Failed to update franchise' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        await prisma.franchise.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Franchise deleted successfully' })
    } catch (error) {
        console.error('Error deleting franchise:', error)
        return NextResponse.json({ error: 'Failed to delete franchise' }, { status: 500 })
    }
}
