import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only FRANCHISOR can create requests (or PROVIDER acting as one?)
        // Let's allow FRANCHISOR role.
        if (session.user.role !== 'FRANCHISOR' && session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { locationId, numberOfStations } = body

        if (!locationId || !numberOfStations) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify ownership of location
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // If user is FRANCHISOR, ensure they own the franchise
        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: session.user.id }
            })

            if (!franchisor || location.franchise.franchisorId !== franchisor.id) {
                return NextResponse.json({ error: 'Unauthorized access to location' }, { status: 403 })
            }
        }

        // Create Request
        const licenseRequest = await prisma.licenseRequest.create({
            data: {
                franchisorId: location.franchise.franchisorId,
                locationId: location.id,
                numberOfStations: parseInt(numberOfStations),
                status: 'PENDING'
            }
        })

        return NextResponse.json({
            success: true,
            request: licenseRequest
        })

    } catch (error) {
        console.error('Error creating license request:', error)
        return NextResponse.json(
            { error: 'Failed to create request' },
            { status: 500 }
        )
    }
}
