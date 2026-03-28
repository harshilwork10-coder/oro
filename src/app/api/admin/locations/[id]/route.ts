import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// GET single location
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
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
        if (!user || user.role !== 'PROVIDER') {
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

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'LOCATION_UPDATED',
            entityType: 'Location',
            entityId: params.id,
            metadata: { name, address }
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
        if (!user || user.role !== 'PROVIDER') {
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

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'LOCATION_DELETED',
            entityType: 'Location',
            entityId: params.id,
            metadata: { name: location.name }
        })

        return NextResponse.json({ message: 'Location deleted successfully' })
    } catch (error) {
        console.error('Error deleting location:', error)
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
