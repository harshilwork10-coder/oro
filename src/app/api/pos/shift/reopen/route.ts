import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'
import { validateReasonCode, SHIFT_REOPEN_REASON_CODES } from '@/lib/constants/reason-codes'

/**
 * POST /api/pos/shift/reopen
 * Reopen a recently closed shift (requires manager approval)
 *
 * Body: { sessionId: string, managerPin: string, reason: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { sessionId, managerPin, reason, reasonCode, reasonNote } = body

        // Validate structured reason code if provided
        if (reasonCode) {
            const codeCheck = validateReasonCode(reasonCode, reasonNote, SHIFT_REOPEN_REASON_CODES)
            if (!codeCheck.valid) return NextResponse.json({ error: codeCheck.error }, { status: 400 })
        }

        if (!sessionId || !reason) {
            return NextResponse.json({ error: 'sessionId and reason required' }, { status: 400 })
        }

        // Verify the session exists and is closed
        const session = await prisma.cashDrawerSession.findUnique({
            where: { id: sessionId }
        })
        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        if (session.status !== 'CLOSED') {
            return NextResponse.json({ error: 'Session is not closed' }, { status: 400 })
        }

        // Only allow reopen within 24 hours
        const closedAt = session.endTime || session.updatedAt
        const hoursSinceClosed = (Date.now() - new Date(closedAt).getTime()) / (1000 * 60 * 60)
        if (hoursSinceClosed > 24) {
            return NextResponse.json({
                error: 'Cannot reopen shift — closed more than 24 hours ago'
            }, { status: 400 })
        }

        // Verify manager role or PIN
        const isManager = user.role === 'OWNER' || user.role === 'FRANCHISOR'
        if (!isManager) {
            if (!managerPin) {
                return NextResponse.json({ error: 'Manager PIN required' }, { status: 403 })
            }
            const pinHolder = await prisma.user.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    pin: managerPin,
                    role: { in: ['OWNER', 'FRANCHISOR', 'MANAGER'] }
                },
                select: { id: true, name: true }
            })
            if (!pinHolder) {
                return NextResponse.json({ error: 'Invalid manager PIN' }, { status: 403 })
            }
        }

        // Reopen the shift
        const reopened = await prisma.cashDrawerSession.update({
            where: { id: sessionId },
            data: {
                status: 'OPEN',
                endTime: null,
                endingCash: null,
                expectedCash: null,
                variance: null,
                notes: `${session.notes || ''}\n[REOPENED] by ${user.name || user.email} at ${new Date().toISOString()} — Reason: ${reason}`
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'SHIFT_REOPENED',
            entityType: 'CashDrawerSession',
            entityId: sessionId,
            details: { reason, hoursSinceClosed: Math.round(hoursSinceClosed * 10) / 10 }
        })

        return NextResponse.json({
            success: true,
            session: reopened
        })
    } catch (error: any) {
        console.error('[SHIFT_REOPEN]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
