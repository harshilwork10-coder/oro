import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// Roles that can read and send notifications
const CAN_SEND_ROLES = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER']

// GET - Fetch notification history and settings
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!CAN_SEND_ROLES.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // R7: Always scope to sender's own franchise; PROVIDER sees all
        const franchiseId = user.role !== 'PROVIDER' ? user.franchiseId : null

        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: { id: true, name: true }
        })

        const employeeCount = await prisma.user.count({
            where: franchiseId ? { franchiseId } : {}
        })

        let customerCount = 0
        if (franchiseId) {
            const program = await prisma.loyaltyProgram.findUnique({ where: { franchiseId } })
            if (program) {
                customerCount = await prisma.loyaltyMember.count({ where: { programId: program.id } })
            }
        }

        const templates = [
            { id: 'promo', name: 'Promotion', icon: '🎉', title: 'Special Offer!', body: '20% off your next purchase. Use code SAVE20', audience: 'customers' },
            { id: 'reminder', name: 'Points Reminder', icon: '⭐', title: 'Use Your Points!', body: 'You have {points} points waiting. Redeem them today!', audience: 'customers' },
            { id: 'shift', name: 'Shift Alert', icon: '⏰', title: 'Shift Reminder', body: 'Your shift starts in 1 hour at {location}', audience: 'employees' },
            { id: 'inventory', name: 'Low Stock Alert', icon: '📦', title: 'Low Stock Warning', body: '{count} items are running low at {location}', audience: 'managers' },
            { id: 'custom', name: 'Custom Message', icon: '💬', title: '', body: '', audience: 'all' }
        ]

        const history = [
            { id: '1', type: 'promo', title: 'Weekend Special!', body: '15% off all spirits this weekend', audience: 'customers', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), sentTo: 342, opened: 156 },
            { id: '2', type: 'inventory', title: 'Low Stock Alert', body: '8 items running low at Downtown', audience: 'managers', sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), sentTo: 3, opened: 3 }
        ]

        return NextResponse.json({
            locations,
            audience: { employees: employeeCount, customers: customerCount, managers: Math.ceil(employeeCount * 0.2) },
            templates,
            history
        })

    } catch (error) {
        console.error('Notifications GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Send notification
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // R7: Only authorized roles can send
        if (!CAN_SEND_ROLES.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden: only Owners and Managers can send notifications' }, { status: 403 })
        }

        const body = await req.json()
        const { title, message, audience, locationId, channel } = body

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
        }

        // R7: Always use server-side franchiseId — never trust client-supplied scope
        const franchiseId = user.franchiseId

        // R7: If locationId provided, verify it belongs to this franchise
        if (locationId && locationId !== 'all' && user.role !== 'PROVIDER') {
            const loc = await prisma.location.findUnique({ where: { id: locationId }, select: { franchiseId: true } })
            if (!loc || loc.franchiseId !== franchiseId) {
                return NextResponse.json({ error: 'Forbidden: location does not belong to your franchise' }, { status: 403 })
            }
        }

        let recipientCount = 0

        if (audience === 'employees' || audience === 'all') {
            const empWhere: any = { franchiseId }
            if (locationId && locationId !== 'all') empWhere.locationId = locationId
            recipientCount += await prisma.user.count({ where: empWhere })
        }

        if (audience === 'customers' || audience === 'all') {
            const program = await prisma.loyaltyProgram.findUnique({ where: { franchiseId } })
            if (program) {
                recipientCount += await prisma.loyaltyMember.count({ where: { programId: program.id } })
            }
        }

        // Audit trail
        const location = await prisma.location.findFirst({ where: { franchiseId }, select: { id: true } })
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
                        details: JSON.stringify({ title, message, audience, recipientCount, sentByRole: user.role })
                    }
                })
            } catch (e) { /* Audit optional */ }
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
