import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST - Publish or unpublish a booking page
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Only owners can publish/unpublish booking pages' }, { status: 403 })
        }

        const body = await req.json()
        const { locationId, publish } = body

        if (!locationId || typeof publish !== 'boolean') {
            return NextResponse.json({ error: 'locationId and publish (boolean) are required' }, { status: 400 })
        }

        // Verify location belongs to this franchise
        const location = await prisma.location.findFirst({
            where: { id: locationId, franchiseId: user.franchiseId }
        })
        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // If publishing, validate readiness
        if (publish) {
            // Check: at least 1 service exists
            const serviceCount = await prisma.service.count({
                where: { franchiseId: user.franchiseId }
            })
            if (serviceCount === 0) {
                return NextResponse.json({
                    error: 'Cannot publish: add at least 1 service first',
                    readiness: { services: false, staff: false, hours: false }
                }, { status: 400 })
            }

            // Check: at least 1 staff member accepting clients
            const staffCount = await prisma.user.count({
                where: {
                    franchiseId: user.franchiseId,
                    role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] },
                    isActive: true,
                    acceptingClients: true
                }
            })
            if (staffCount === 0) {
                return NextResponse.json({
                    error: 'Cannot publish: at least 1 staff member must be accepting clients',
                    readiness: { services: true, staff: false, hours: false }
                }, { status: 400 })
            }

            // Check: operating hours configured
            if (!location.operatingHours) {
                return NextResponse.json({
                    error: 'Cannot publish: set operating hours first',
                    readiness: { services: true, staff: true, hours: false }
                }, { status: 400 })
            }
        }

        // Upsert the booking profile
        const profile = await prisma.bookingProfile.upsert({
            where: { locationId },
            update: {
                isPublished: publish,
                publishedAt: publish ? new Date() : null,
                setupCompleted: publish ? true : undefined,
                setupStep: publish ? 'publish' : undefined
            },
            create: {
                locationId,
                isPublished: publish,
                publishedAt: publish ? new Date() : null,
                setupCompleted: publish,
                setupStep: publish ? 'publish' : 'services'
            }
        })

        // Also sync FranchiseSettings.enableOnlineBooking
        if (publish) {
            await prisma.franchiseSettings.upsert({
                where: { franchiseId: user.franchiseId },
                update: { enableOnlineBooking: true },
                create: { franchiseId: user.franchiseId, enableOnlineBooking: true }
            })
        }

        return NextResponse.json({
            success: true,
            published: profile.isPublished,
            publishedAt: profile.publishedAt,
            profile
        })
    } catch (error) {
        console.error('Error publishing booking profile:', error)
        return NextResponse.json({ error: 'Failed to update publish state' }, { status: 500 })
    }
}
