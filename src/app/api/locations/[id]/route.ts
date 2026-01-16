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

        // Allow PROVIDER, FRANCHISOR, OWNER, and EMPLOYEE to access location details
        // EMPLOYEE needs this for POS operations
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const location = await prisma.location.findUnique({
            where: { id },
            include: {
                franchise: true,
                users: true,
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error) {
        console.error('Error fetching location:', error)
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
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
        const { name, address, franchiseId } = body
        const { id } = await context.params

        const location = await prisma.location.update({
            where: { id },
            data: {
                name,
                address,
                franchiseId: franchiseId || null,
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        })

        return NextResponse.json(location)
    } catch (error) {
        console.error('Error updating location:', error)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
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
        await prisma.location.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Location deleted successfully' })
    } catch (error) {
        console.error('Error deleting location:', error)
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
