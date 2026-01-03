import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Franchisee requests a new location (expansion)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISEE') {
            return NextResponse.json({ error: 'Unauthorized - Franchisee only' }, { status: 401 })
        }

        const { proposedName, proposedAddress, notes } = await req.json()

        if (!proposedName || !proposedAddress) {
            return NextResponse.json({
                error: 'Location name and address are required'
            }, { status: 400 })
        }

        // Get the franchisee's franchise
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({
                error: 'You are not associated with a franchise'
            }, { status: 400 })
        }

        // Check if there's already a pending request for same name
        const existing = await prisma.expansionRequest.findFirst({
            where: {
                franchiseeId: session.user.id,
                proposedName,
                status: 'PENDING'
            }
        })

        if (existing) {
            return NextResponse.json({
                error: 'You already have a pending request for this location'
            }, { status: 400 })
        }

        // Create expansion request
        const request = await prisma.expansionRequest.create({
            data: {
                franchiseeId: session.user.id,
                franchiseId: user.franchiseId,
                proposedName,
                proposedAddress,
                notes
            },
            include: {
                franchise: { select: { name: true } }
            }
        })

        console.log(`[Expansion Request] ${user.name} requested new location: ${proposedName}`)

        return NextResponse.json({
            success: true,
            request
        })

    } catch (error) {
        console.error('Error creating expansion request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET: Get expansion requests
// - Franchisee: gets their own requests
// - Franchisor: gets all requests for their franchise(s)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.role === 'FRANCHISEE') {
            // Franchisee sees their own requests
            const requests = await prisma.expansionRequest.findMany({
                where: { franchiseeId: session.user.id },
                include: {
                    franchise: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
            return NextResponse.json(requests)
        }

        if (session.user.role === 'FRANCHISOR') {
            // Franchisor sees requests for their franchises
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: session.user.id },
                include: { franchises: { select: { id: true } } }
            })

            if (!franchisor) {
                return NextResponse.json([])
            }

            const franchiseIds = franchisor.franchises.map(f => f.id)

            const requests = await prisma.expansionRequest.findMany({
                where: {
                    franchiseId: { in: franchiseIds }
                },
                include: {
                    franchise: { select: { name: true } },
                    franchisee: { select: { id: true, name: true, email: true } }
                },
                orderBy: [
                    { status: 'asc' }, // PENDING first
                    { createdAt: 'desc' }
                ]
            })
            return NextResponse.json(requests)
        }

        return NextResponse.json({ error: 'Invalid role' }, { status: 403 })

    } catch (error) {
        console.error('Error fetching expansion requests:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

