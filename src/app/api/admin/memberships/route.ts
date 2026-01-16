import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: List all memberships for a franchisor (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const franchisorId = searchParams.get('franchisorId')

        if (!franchisorId) {
            return NextResponse.json({ error: 'franchisorId required' }, { status: 400 })
        }

        const memberships = await prisma.franchisorMembership.findMany({
            where: { franchisorId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' }
            ]
        })

        return NextResponse.json(memberships)
    } catch (error) {
        console.error('Error fetching memberships:', error)
        return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }
}

// POST: Add a user to a franchisor (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { franchisorId, email, role = 'ADMIN', isPrimary = false } = body

        if (!franchisorId || !email) {
            return NextResponse.json({ error: 'franchisorId and email required' }, { status: 400 })
        }

        // Find user by email
        let user = await prisma.user.findUnique({ where: { email } })

        // If user doesn't exist, create them
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    role: 'FRANCHISOR',
                    isActive: true
                }
            })
        }

        // Check if membership already exists
        const existingMembership = await prisma.franchisorMembership.findUnique({
            where: {
                userId_franchisorId: {
                    userId: user.id,
                    franchisorId
                }
            }
        })

        if (existingMembership) {
            return NextResponse.json({ error: 'User already has access to this business' }, { status: 400 })
        }

        // If setting as primary, unset other primary memberships
        if (isPrimary) {
            await prisma.franchisorMembership.updateMany({
                where: { franchisorId, isPrimary: true },
                data: { isPrimary: false }
            })
        }

        // Create membership
        const membership = await prisma.franchisorMembership.create({
            data: {
                userId: user.id,
                franchisorId,
                role,
                isPrimary
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json(membership, { status: 201 })
    } catch (error) {
        console.error('Error creating membership:', error)
        return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }
}

// DELETE: Remove a membership (admin only)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const membershipId = searchParams.get('id')

        if (!membershipId) {
            return NextResponse.json({ error: 'Membership id required' }, { status: 400 })
        }

        // Check if this is the only primary owner
        const membership = await prisma.franchisorMembership.findUnique({
            where: { id: membershipId }
        })

        if (!membership) {
            return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
        }

        if (membership.isPrimary) {
            // Check if there are other members
            const otherMembers = await prisma.franchisorMembership.count({
                where: {
                    franchisorId: membership.franchisorId,
                    id: { not: membershipId }
                }
            })

            if (otherMembers === 0) {
                return NextResponse.json({
                    error: 'Cannot remove the only member. Transfer ownership first.'
                }, { status: 400 })
            }
        }

        await prisma.franchisorMembership.delete({
            where: { id: membershipId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting membership:', error)
        return NextResponse.json({ error: 'Failed to delete membership' }, { status: 500 })
    }
}
