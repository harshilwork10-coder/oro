import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Drawer Activity Types
type DrawerActivityType =
    | 'SALE_OPEN'           // Normal sale - drawer opened for transaction
    | 'NO_SALE'             // Drawer opened without sale
    | 'CASH_DROP'           // Cash removed from drawer (deposit)
    | 'PAID_IN'             // Cash added to drawer
    | 'PAID_OUT'            // Cash paid out (vendor, etc.)
    | 'TIP_PAYOUT'          // Tips paid to employee
    | 'REFUND'              // Refund issued
    | 'MANAGER_OVERRIDE'    // Manager opened without reason

// Reason categories for no-sale opens
const NO_SALE_REASONS = [
    'make_change',          // Customer needed change
    'verify_cash',          // Verify drawer count
    'error_correction',     // Fix a mistake
    'give_receipt',         // Customer returned for receipt
    'cash_drop',           // Remove excess cash
    'manager_request',      // Manager asked to open
    'other'                 // Other (requires note)
]

// POST - Log drawer activity
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            type,           // Activity type
            reason,         // Reason code (for NO_SALE)
            note,           // Additional note
            amount,         // Amount if applicable
            shiftId,        // Current shift
            locationId,     // Location ID
            transactionId   // Related transaction if any
        } = body

        // Validate required fields
        if (!type || !locationId) {
            return NextResponse.json({ error: 'Type and location required' }, { status: 400 })
        }

        // Security: Verify location belongs to user's franchise
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        if (location.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // For NO_SALE, reason is required
        if (type === 'NO_SALE' && !reason) {
            return NextResponse.json({ error: 'Reason required for no-sale drawer open' }, { status: 400 })
        }

        // Create drawer activity log
        const activity = await prisma.drawerActivity.create({
            data: {
                type,
                reason: reason || null,
                note: note || null,
                amount: amount ? parseFloat(amount) : null,
                employeeId: user.id,
                shiftId: shiftId || null,
                locationId,
                transactionId: transactionId || null,
                timestamp: new Date()
            },
            include: {
                employee: {
                    select: { name: true, email: true }
                }
            }
        })

        // Check if this triggers an alert (too many no-sales)
        if (type === 'NO_SALE') {
            await checkNoSaleAlerts(locationId, user.id)
        }

        return NextResponse.json(activity)

    } catch (error) {
        console.error('Error logging drawer activity:', error)
        return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }
}

// GET - Get drawer activity for a shift/location/date
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const shiftId = searchParams.get('shiftId')
        const date = searchParams.get('date')
        const type = searchParams.get('type')

        const where: any = {}

        if (locationId) where.locationId = locationId
        if (shiftId) where.shiftId = shiftId
        if (type) where.type = type

        if (date) {
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)
            where.timestamp = { gte: startOfDay, lte: endOfDay }
        }

        const activities = await prisma.drawerActivity.findMany({
            where,
            include: {
                employee: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        })

        // Calculate summary
        const summary = {
            totalOpens: activities.length,
            noSaleCount: activities.filter(a => a.type === 'NO_SALE').length,
            saleOpens: activities.filter(a => a.type === 'SALE_OPEN').length,
            refunds: activities.filter(a => a.type === 'REFUND').length,
            cashDrops: activities.filter(a => a.type === 'CASH_DROP').length
        }

        return NextResponse.json({ activities, summary })

    } catch (error) {
        console.error('Error getting drawer activities:', error)
        return NextResponse.json({ error: 'Failed to get activities' }, { status: 500 })
    }
}

// Helper: Check if no-sale count triggers alert
async function checkNoSaleAlerts(locationId: string, employeeId: string) {
    try {
        // Count no-sales today for this location
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const noSaleCount = await prisma.drawerActivity.count({
            where: {
                locationId,
                type: 'NO_SALE',
                timestamp: { gte: today }
            }
        })

        // Alert thresholds
        const ALERT_THRESHOLD = 5  // Alert at 5+ no-sales per day
        const CRITICAL_THRESHOLD = 10  // Critical at 10+ no-sales

        if (noSaleCount >= ALERT_THRESHOLD) {
            // Get location and owner info
            const location = await prisma.location.findUnique({
                where: { id: locationId },
                include: {
                    franchise: {
                        include: {
                            franchisor: {
                                include: {
                                    owner: { select: { id: true, email: true, name: true } }
                                }
                            }
                        }
                    }
                }
            })

            // Create alert notification
            const alertLevel = noSaleCount >= CRITICAL_THRESHOLD ? 'CRITICAL' : 'WARNING'

            console.log(`🚨 DRAWER ALERT [${alertLevel}]: Location ${location?.name} has ${noSaleCount} no-sale drawer opens today`)

            // TODO: Send email/push notification to franchisor
            // TODO: Create in-app alert/notification
        }
    } catch (error) {
        console.error('Error checking no-sale alerts:', error)
    }
}
