import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { validateReasonCode, DISCREPANCY_REASON_CODES } from '@/lib/constants/reason-codes'

/**
 * POST /api/pos/shift/variance-approval
 * Manager approves a drawer variance above the configured threshold
 *
 * Body: { sessionId: string, managerPin: string, notes?: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { sessionId, managerPin, notes, reasonCode, reasonNote } = body

        // Validate structured reason code if provided
        if (reasonCode) {
            const codeCheck = validateReasonCode(reasonCode, reasonNote, DISCREPANCY_REASON_CODES)
            if (!codeCheck.valid) return NextResponse.json({ error: codeCheck.error }, { status: 400 })
        }

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }

        // Verify the session exists and is closed
        const session = await prisma.cashDrawerSession.findUnique({
            where: { id: sessionId }
        })
        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        if (session.status !== 'CLOSED') {
            return NextResponse.json({ error: 'Session is not closed — close the shift first' }, { status: 400 })
        }

        // Verify manager role — either the caller is a manager/owner, or verify PIN
        const isManager = user.role === 'OWNER' || user.role === 'FRANCHISOR'
        if (!isManager && managerPin) {
            // Verify PIN against managers in the franchise
            const pinHolder = await prisma.user.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    pin: managerPin,
                    role: { in: ['OWNER', 'FRANCHISOR', 'MANAGER'] }
                },
                select: { id: true, name: true, role: true }
            })
            if (!pinHolder) {
                return NextResponse.json({ error: 'Invalid manager PIN' }, { status: 403 })
            }
        } else if (!isManager) {
            return NextResponse.json({ error: 'Manager authentication required' }, { status: 403 })
        }

        // Calculate variance
        const endingCash = Number(session.endingCash || 0)
        const expectedCash = Number(session.expectedCash || 0)
        const variance = endingCash - expectedCash

        // Update session with variance approval
        const updated = await prisma.cashDrawerSession.update({
            where: { id: sessionId },
            data: {
                notes: `${session.notes || ''}\n[VARIANCE APPROVED] $${Math.abs(variance).toFixed(2)} ${variance >= 0 ? 'over' : 'short'} — approved by ${user.name || user.email} at ${new Date().toISOString()}${notes ? ` — ${notes}` : ''}`
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'VARIANCE_APPROVED',
            entityType: 'CashDrawerSession',
            entityId: sessionId,
            details: {
                variance: Math.round(variance * 100) / 100,
                endingCash,
                expectedCash,
                approverNotes: notes
            }
        })

        return NextResponse.json({
            success: true,
            variance: Math.round(variance * 100) / 100,
            approved: true
        })
    } catch (error: any) {
        console.error('[VARIANCE_APPROVAL]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
