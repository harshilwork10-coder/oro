import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all SMS requests (for provider)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can view SMS requests' }, { status: 403 })
        }

        // Get all franchises with SMS settings and credits
        const franchises = await prisma.franchise.findMany({
            include: {
                reminderSettings: true,
                smsCredits: true,
                franchisor: {
                    include: { owner: { select: { name: true, email: true } } }
                },
                locations: { select: { id: true, name: true } }
            }
        })

        const requests = franchises.map(f => ({
            id: f.id,
            name: f.name,
            ownerName: f.franchisor?.owner?.name || 'Unknown',
            ownerEmail: f.franchisor?.owner?.email || '',
            locationCount: f.locations.length,
            smsEnabled: f.reminderSettings?.smsEnabled || false,
            smsApproved: f.reminderSettings?.smsApproved || false,
            smsRequestedAt: f.reminderSettings?.smsRequestedAt || null,
            creditsRemaining: f.smsCredits?.creditsRemaining || 0,
            creditsUsed: f.smsCredits?.creditsUsed || 0
        }))

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Error fetching SMS requests:', error)
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
}

// PATCH - Approve or reject SMS request
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can approve SMS' }, { status: 403 })
        }

        const body = await request.json()
        const { franchiseId, approve } = body

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        // Update or create reminder settings
        await prisma.reminderSettings.upsert({
            where: { franchiseId },
            update: {
                smsApproved: approve,
                smsEnabled: approve // Enable if approved
            },
            create: {
                franchiseId,
                smsApproved: approve,
                smsEnabled: approve
            }
        })

        return NextResponse.json({
            success: true,
            message: approve ? 'SMS access approved' : 'SMS access revoked'
        })
    } catch (error) {
        console.error('Error updating SMS approval:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
