import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { validateReasonCode, PAID_IN_REASON_CODES, PAID_OUT_REASON_CODES } from '@/lib/constants/reason-codes'

/**
 * POST /api/pos/paid-in-out
 * Record a Paid In (cash added to drawer) or Paid Out (cash removed from drawer)
 * 
 * Body: { type: 'PAID_IN' | 'PAID_OUT', amount: number, reason: string, note?: string, cashDrawerSessionId: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { type, amount, reason, reasonCode, reasonNote, note, cashDrawerSessionId } = body

        // Validate type
        if (!type || !['PAID_IN', 'PAID_OUT'].includes(type)) {
            return NextResponse.json({ error: 'Type must be PAID_IN or PAID_OUT' }, { status: 400 })
        }

        // Validate amount
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
        }

        // Validate reason
        if (!reason) {
            return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
        }

        // Validate shift is open
        if (!cashDrawerSessionId) {
            return NextResponse.json({ error: 'No active shift. Open a shift first.' }, { status: 400 })
        }

        const session = await prisma.cashDrawerSession.findUnique({
            where: { id: cashDrawerSessionId },
            include: { location: true }
        })

        if (!session || session.endTime) {
            return NextResponse.json({ error: 'Shift is closed. Cannot record paid in/out.' }, { status: 400 })
        }

        // Create DrawerActivity record
        const activity = await prisma.drawerActivity.create({
            data: {
                type,
                amount,
                reason,
                note: note || null,
                employeeId: user.id,
                shiftId: cashDrawerSessionId,
                locationId: session.locationId
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: type === 'PAID_IN' ? ActionTypes.PAID_IN : ActionTypes.PAID_OUT,
            entityType: 'DrawerActivity',
            entityId: activity.id,
            details: {
                type,
                amount,
                reason,
                note,
                shiftId: cashDrawerSessionId,
                locationId: session.locationId
            }
        })

        return NextResponse.json({
            success: true,
            id: activity.id,
            type,
            amount,
            reason,
            timestamp: activity.timestamp
        })
    } catch (error: any) {
        console.error('[POS_PAID_IN_OUT]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * GET /api/pos/paid-in-out?shiftId=xxx
 * Get paid in/out history for a shift
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shiftId = searchParams.get('shiftId')

    if (!shiftId) {
        return NextResponse.json({ error: 'shiftId required' }, { status: 400 })
    }

    try {
        const activities = await prisma.drawerActivity.findMany({
            where: {
                shiftId,
                type: { in: ['PAID_IN', 'PAID_OUT'] }
            },
            include: {
                employee: { select: { name: true } }
            },
            orderBy: { timestamp: 'desc' }
        })

        const totals = activities.reduce((acc, a) => {
            if (a.type === 'PAID_IN') acc.totalIn += a.amount || 0
            else acc.totalOut += a.amount || 0
            return acc
        }, { totalIn: 0, totalOut: 0 })

        return NextResponse.json({ activities, ...totals })
    } catch (error: any) {
        console.error('[POS_PAID_IN_OUT_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
