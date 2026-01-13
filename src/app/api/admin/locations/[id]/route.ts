import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET single location
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const params = await props.params
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        users: true
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json({ location })
    } catch (error) {
        console.error('Error fetching location:', error)
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }
}

// PUT update location
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const params = await props.params
        const body = await request.json()
        const { name, address } = body

        const location = await prisma.location.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(address !== undefined && { address })
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json({ location, message: 'Location updated' })
    } catch (error) {
        console.error('Error updating location:', error)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

// DELETE location
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const params = await props.params

        // Check if location exists
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        users: true
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Warn if location has users
        if (location._count.users > 0) {
            return NextResponse.json({
                error: `Cannot delete location with ${location._count.users} staff members. Remove staff first.`,
                hasData: true
            }, { status: 400 })
        }

        // Delete the location
        await prisma.location.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ message: 'Location deleted successfully' })
    } catch (error) {
        console.error('Error deleting location:', error)
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
