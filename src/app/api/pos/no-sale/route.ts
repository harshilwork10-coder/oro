import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/auditLog'
import { validateReasonCode, NO_SALE_REASON_CODES } from '@/lib/constants/reason-codes'

/**
 * No Sale — Open drawer without a transaction
 * POST /api/pos/no-sale
 *
 * Logs for loss prevention. Mandatory reason from dropdown.
 */
// Use centralized reason codes (legacy list kept for backward compat)
const VALID_REASONS = NO_SALE_REASON_CODES.map(r => r.code)

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { reason, reasonNote, stationId } = body

        const codeCheck = validateReasonCode(reason, reasonNote, NO_SALE_REASON_CODES)
        if (!codeCheck.valid) {
            return NextResponse.json({
                error: codeCheck.error,
                validReasons: VALID_REASONS
            }, { status: 400 })
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'NO_SALE', entityType: 'CashDrawer', entityId: stationId || 'unknown',
            details: { reason, reasonNote: reasonNote || null, stationId, cashier: user.email }
        })

        return NextResponse.json({
            success: true, drawerCommand: 'KICK', logged: true,
            event: { type: 'NO_SALE', cashier: user.email, reason, timestamp: new Date().toISOString() }
        })
    } catch (error: any) {
        console.error('[NO_SALE_POST]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
