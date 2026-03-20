import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Get locations for this franchise, then get campaigns for those locations
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const campaigns = await prisma.dealCampaign.findMany({
            where: { locationId: { in: locationIds } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                location: { select: { name: true } }
            }
        })

        return NextResponse.json(campaigns)
    } catch (error) {
        console.error('Error fetching campaigns:', error)
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Only OWNER, MANAGER can create campaigns
        if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await req.json()
        const { messageTemplate, locationId } = body

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        // Verify location belongs to user's franchise
        const location = await prisma.location.findFirst({
            where: { id: locationId, franchiseId: user.franchiseId }
        })
        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        const templateContent = messageTemplate || ''
        const templateHash = Buffer.from(templateContent).toString('base64').slice(0, 32)

        const campaign = await (prisma.dealCampaign as any).create({
            data: {
                templateHash,
                messageTemplate: templateContent,
                locationId,
                createdById: user.id,
                scheduledFor: new Date(),
                status: 'DRAFT',
            }
        })

        return NextResponse.json(campaign)
    } catch (error) {
        console.error('Error creating campaign:', error)
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }
}
