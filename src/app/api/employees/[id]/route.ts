import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthUser(request)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!session || (authUser.role !== 'PROVIDER' && authUser.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                franchise: true,
                location: true,
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const { password, ...userWithoutPassword } = user
        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!session || authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, email, role, franchiseId, locationId } = body
        const { id } = await context.params

        const user = await prisma.user.update({
            where: { id },
            data: {
                name,
                email,
                role,
                franchiseId: franchiseId || null,
                locationId: locationId || null,
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                location: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        })

        const { password, ...userWithoutPassword } = user
        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!session || authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params

        // Prevent deleting provider users
        const user = await prisma.user.findUnique({
            where: { id }
        })

        if (user?.role === 'PROVIDER') {
            return NextResponse.json({ error: 'Cannot delete provider users' }, { status: 403 })
        }

        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}
