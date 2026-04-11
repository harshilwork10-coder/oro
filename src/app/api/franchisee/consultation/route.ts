import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const authUser = await getAuthUser(request)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with franchise info
        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'User is not associated with a franchise' }, { status: 400 })
        }

        const body = await request.json()
        const { reason, details, contactPhone, preferredContactTime } = body

        if (!reason || !details || !contactPhone) {
            return NextResponse.json({ error: 'Reason, details, and contact phone are required' }, { status: 400 })
        }

        /*
        const consultationRequest = await prisma.consultationRequest.create({
            data: {
                franchiseId: user.franchiseId,
                reason,
                details,
                contactPhone,
                preferredContactTime,
                status: 'PENDING'
            }
        })

        return NextResponse.json(consultationRequest)
        */
        return NextResponse.json({
            id: 'mock-id',
            franchiseId: user.franchiseId,
            reason,
            details,
            contactPhone,
            preferredContactTime,
            status: 'PENDING'
        })
    } catch (error) {
        console.error('Error creating consultation request:', error)
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
}

