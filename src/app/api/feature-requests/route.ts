import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch feature requests for current franchisor
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Find the franchisor for this user
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json([])
        }

        // Fetch feature requests for this franchisor
        const requests = await prisma.featureRequest.findMany({
            where: { franchisorId: franchisor.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Error fetching feature requests:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST: Submit a new feature request
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { featureKey } = await req.json()

        if (!featureKey) {
            return NextResponse.json({ error: 'Feature key is required' }, { status: 400 })
        }

        // Find the franchisor for this user
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Check if request already exists
        const existing = await prisma.featureRequest.findFirst({
            where: {
                franchisorId: franchisor.id,
                featureKey,
                status: 'PENDING'
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'Request already pending' }, { status: 400 })
        }

        // Create the request
        const request = await prisma.featureRequest.create({
            data: {
                franchisorId: franchisor.id,
                featureKey,
                status: 'PENDING'
            }
        })

        return NextResponse.json(request)
    } catch (error) {
        console.error('Error creating feature request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

