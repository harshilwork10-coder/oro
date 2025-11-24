import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor's ID
        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            include: { franchisor: true }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 404 })
        }

        const requests = await prisma.expansionRequest.findMany({
            where: {
                franchise: {
                    franchisorId: user.franchisor.id
                }
            },
            include: {
                franchise: {
                    select: {
                        name: true,
                        users: {
                            where: { role: 'EMPLOYEE' }, // Assuming franchisee owner is an employee role or we pick the first user
                            take: 1,
                            select: { name: true, email: true }
                        }
                    }
                },
                createdLocation: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Error fetching expansion requests:', error)
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { requestId, status, rejectionReason } = body

        if (!requestId || !['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Get the request first to check if it exists and get details
        const existingRequest = await prisma.expansionRequest.findUnique({
            where: { id: requestId },
            include: { franchise: true }
        })

        if (!existingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        if (existingRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
        }

        let updatedRequest;

        if (status === 'APPROVED') {
            // TRANSACTION: Update request AND create location
            updatedRequest = await prisma.$transaction(async (tx) => {
                // 1. Create the new location
                const newLocation = await tx.location.create({
                    data: {
                        name: existingRequest.proposedLocation, // Use proposed name
                        address: existingRequest.proposedAddress || 'TBD',
                        // In a real app, we'd parse city/state/zip from the request or use the new fields
                        // For now, we'll use defaults or what's available
                        franchiseId: existingRequest.franchiseId,
                        status: 'PENDING_SETUP',
                        targetGrandOpening: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // +6 months
                        onboardingStatus: JSON.stringify({
                            steps: [
                                { id: 'permits', title: 'Obtain Permits', status: 'PENDING' },
                                { id: 'buildout', title: 'Construction/Build-out', status: 'PENDING' },
                                { id: 'hiring', title: 'Hire Staff', status: 'PENDING' },
                                { id: 'training', title: 'Staff Training', status: 'PENDING' },
                                { id: 'marketing', title: 'Grand Opening Marketing', status: 'PENDING' }
                            ]
                        })
                    }
                })

                // 2. Update the expansion request
                return await tx.expansionRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'APPROVED',
                        reviewedAt: new Date(),
                        reviewedBy: session.user.email, // Using email as ID proxy for now
                        createdLocationId: newLocation.id
                    },
                    include: { createdLocation: true }
                })
            })
        } else {
            // REJECTED
            updatedRequest = await prisma.expansionRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    reviewedAt: new Date(),
                    reviewedBy: session.user.email,
                    rejectionReason: rejectionReason || 'No reason provided'
                }
            })
        }

        return NextResponse.json(updatedRequest)
    } catch (error) {
        console.error('Error updating expansion request:', error)
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }
}
