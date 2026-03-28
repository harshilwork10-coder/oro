import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/payment-timeout — Record a payment terminal timeout event
 * 
 * When a card terminal times out mid-authorization, the POS calls this to:
 * 1. Log the timeout for audit
 * 2. Attempt void/reversal if partial auth was recorded
 * 3. Return recovery instructions
 * 
 * Body: { transactionId?, gatewayTxId?, authCode?, cardLast4?, amount, stationId? }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { transactionId, gatewayTxId, authCode, cardLast4, amount, stationId } = body

        // Log the timeout event
        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'PAYMENT_TIMEOUT',
            entityType: 'Transaction',
            entityId: transactionId || 'UNKNOWN',
            details: {
                gatewayTxId, authCode, cardLast4, amount, stationId,
                timestamp: new Date().toISOString(),
                recoveryAttempted: !!gatewayTxId
            }
        })

        // If we have a gateway transaction ID, check if there's a partial auth to void
        let reversalStatus = 'NOT_ATTEMPTED'
        if (gatewayTxId && transactionId) {
            // Check if partial auth was recorded
            const tx = await prisma.transaction.findFirst({
                where: { id: transactionId, franchiseId: user.franchiseId }
            })
            if (tx && tx.status === 'PENDING') {
                // Mark as timed out for manual resolution
                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: 'VOIDED',
                        voidReason: `PAYMENT_TIMEOUT: Terminal timeout. Gateway TX: ${gatewayTxId}. Requires manual verification with processor.`
                    }
                })
                reversalStatus = 'TRANSACTION_VOIDED'
            } else {
                reversalStatus = 'NO_PENDING_TRANSACTION'
            }
        }

        return NextResponse.json({
            recorded: true,
            reversalStatus,
            recovery: {
                steps: [
                    'Check terminal for approval/decline screen',
                    'If terminal shows APPROVED, record the sale manually',
                    'If terminal shows DECLINED or no response, re-attempt the sale',
                    'Contact payment processor if still uncertain',
                    `Reference: Gateway TX ${gatewayTxId || 'N/A'}`
                ],
                contactProcessor: !!gatewayTxId,
                manualReviewRequired: reversalStatus !== 'TRANSACTION_VOIDED'
            }
        })
    } catch (error: any) {
        console.error('[PAYMENT_TIMEOUT_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to record timeout' }, { status: 500 })
    }
}
