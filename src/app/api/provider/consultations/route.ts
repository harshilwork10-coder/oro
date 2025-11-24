import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const requests = await prisma.consultationRequest.findMany({
            include: {
                franchise: {
                    select: {
                        name: true,
                        users: {
                            take: 1,
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Error fetching consultation requests:', error)
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { requestId, status, resolution } = body

        if (!requestId || !['CONTACTED', 'RESOLVED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const updatedRequest = await prisma.consultationRequest.update({
            where: { id: requestId },
            data: {
                status,
                resolution,
                resolvedAt: status === 'RESOLVED' ? new Date() : undefined
            }
        })

        return NextResponse.json(updatedRequest)
    } catch (error) {
        console.error('Error updating consultation request:', error)
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }
}
