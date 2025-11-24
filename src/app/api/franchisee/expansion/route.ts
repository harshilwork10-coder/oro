import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with franchise info
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'User is not associated with a franchise' }, { status: 400 })
        }

        const body = await request.json()
        const { proposedLocation, notes } = body

        if (!proposedLocation) {
            return NextResponse.json({ error: 'Location is required' }, { status: 400 })
        }

        const expansionRequest = await prisma.expansionRequest.create({
            data: {
                franchiseId: user.franchiseId,
                proposedLocation,
                notes,
                status: 'PENDING'
            }
        })

        return NextResponse.json(expansionRequest)
    } catch (error) {
        console.error('Error creating expansion request:', error)
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
}
