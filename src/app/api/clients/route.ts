import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET: Fetch all clients for the franchise
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        let franchiseId = user.franchiseId

        // Handle FRANCHISOR users
        if (user.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Get search query if provided
        const searchParams = req.nextUrl.searchParams
        const search = searchParams.get('search')

        const whereClause: any = { franchiseId }

        if (search) {
            whereClause.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } }
            ]
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        appointments: true,
                        transactions: true
                    }
                },
                loyalty: true
            }
        })

        return NextResponse.json(clients)
    } catch (error) {
        console.error('Error fetching clients:', error)
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }
}

// POST: Create new client
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { firstName, lastName, email, phone, franchiseId: bodyFranchiseId } = body

        if (!firstName) {
            return NextResponse.json(
                { error: 'First name is required' },
                { status: 400 }
            )
        }

        // Get franchiseId from request body or from session user
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        let franchiseId = bodyFranchiseId || user?.franchiseId

        // Handle FRANCHISOR users
        if (user?.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json(
                { error: 'Franchise ID is required' },
                { status: 400 }
            )
        }

        const client = await prisma.client.create({
            data: {
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                franchiseId,
            },
        })

        return NextResponse.json(client, { status: 201 })
    } catch (error) {
        console.error('Error creating client:', error)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }
}

// DELETE: Delete client
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        let franchiseId = user.franchiseId

        // Handle FRANCHISOR users
        if (user.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { select: { id: true } } }
            })
            if (franchisor) {
                const franchiseIds = franchisor.franchises.map(f => f.id)
                // Delete client if it belongs to any of their franchises
                const result = await prisma.client.deleteMany({
                    where: {
                        id,
                        franchiseId: { in: franchiseIds }
                    }
                })

                if (result.count === 0) {
                    return NextResponse.json({ error: 'Client not found or not authorized' }, { status: 404 })
                }

                return NextResponse.json({ success: true })
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Delete client only if it belongs to the user's franchise
        const result = await prisma.client.deleteMany({
            where: {
                id,
                franchiseId
            }
        })

        if (result.count === 0) {
            return NextResponse.json({ error: 'Client not found or not authorized' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting client:', error)
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }
}

