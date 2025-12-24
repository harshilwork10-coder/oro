import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch notification history and settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'history' // history, templates

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Get locations for targeting
        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: { id: true, name: true }
        })

        // Get employee count for audience estimation
        const employeeCount = await prisma.user.count({
            where: franchiseId ? { franchiseId } : {}
        })

        // Get customer count (loyalty members) for audience
        let customerCount = 0
        if (franchiseId) {
            const program = await prisma.loyaltyProgram.findUnique({
                where: { franchiseId }
            })
            if (program) {
                customerCount = await prisma.loyaltyMember.count({
                    where: { programId: program.id }
                })
            }
        }

        // Default notification templates
        const templates = [
            {
                id: 'promo',
                name: 'Promotion',
                icon: '🎉',
                title: 'Special Offer!',
                body: '20% off your next purchase. Use code SAVE20',
                audience: 'customers'
            },
            {
                id: 'reminder',
                name: 'Points Reminder',
                icon: '⭐',
                title: 'Use Your Points!',
                body: 'You have {points} points waiting. Redeem them today!',
                audience: 'customers'
            },
            {
                id: 'shift',
                name: 'Shift Alert',
                icon: '⏰',
                title: 'Shift Reminder',
                body: 'Your shift starts in 1 hour at {location}',
                audience: 'employees'
            },
            {
                id: 'inventory',
                name: 'Low Stock Alert',
                icon: '📦',
                title: 'Low Stock Warning',
                body: '{count} items are running low at {location}',
                audience: 'managers'
            },
            {
                id: 'custom',
                name: 'Custom Message',
                icon: '💬',
                title: '',
                body: '',
                audience: 'all'
            }
        ]

        // Simulated notification history (in production, this would be stored)
        const history = [
            {
                id: '1',
                type: 'promo',
                title: 'Weekend Special!',
                body: '15% off all spirits this weekend',
                audience: 'customers',
                sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                sentTo: 342,
                opened: 156
            },
            {
                id: '2',
                type: 'inventory',
                title: 'Low Stock Alert',
                body: '8 items running low at Downtown',
                audience: 'managers',
                sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                sentTo: 3,
                opened: 3
            }
        ]

        return NextResponse.json({
            locations,
            audience: {
                employees: employeeCount,
                customers: customerCount,
                managers: Math.ceil(employeeCount * 0.2)
            },
            templates,
            history
        })

    } catch (error) {
        console.error('Notifications GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Send notification
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { title, message, audience, locationId, channel } = body
        // audience: 'all', 'employees', 'managers', 'customers'
        // channel: 'push', 'sms', 'email', 'all'

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
        }

        const franchiseId = user.franchiseId

        // Count recipients
        let recipientCount = 0

        if (audience === 'employees' || audience === 'all') {
            const empWhere: any = {}
            if (franchiseId) empWhere.franchiseId = franchiseId
            if (locationId && locationId !== 'all') empWhere.locationId = locationId
            recipientCount += await prisma.user.count({ where: empWhere })
        }

        if (audience === 'customers' || audience === 'all') {
            if (franchiseId) {
                const program = await prisma.loyaltyProgram.findUnique({
                    where: { franchiseId }
                })
                if (program) {
                    recipientCount += await prisma.loyaltyMember.count({
                        where: { programId: program.id }
                    })
                }
            }
        }

        // In production, this would:
        // 1. Queue notification for sending
        // 2. Use Firebase/OneSignal for push
        // 3. Use Twilio for SMS
        // 4. Use SendGrid/SES for email

        // For now, we log and simulate
        console.log('Notification queued:', {
            title,
            message,
            audience,
            locationId,
            channel,
            recipientCount,
            sentBy: user.id
        })

        // Create audit event
        if (franchiseId) {
            const location = await prisma.location.findFirst({
                where: { franchiseId },
                select: { id: true }
            })
            if (location) {
                try {
                    await prisma.auditEvent.create({
                        data: {
                            locationId: location.id,
                            franchiseId,
                            eventType: 'NOTIFICATION_SENT',
                            severity: 'LOW',
                            employeeId: user.id,
                            employeeName: user.name,
                            details: JSON.stringify({ title, message, audience, recipientCount })
                        }
                    })
                } catch (e) {
                    // Audit optional
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Notification queued for ${recipientCount} recipients`,
            recipientCount,
            channels: channel === 'all' ? ['push', 'sms', 'email'] : [channel]
        })

    } catch (error) {
        console.error('Notifications POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
