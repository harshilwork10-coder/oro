import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/partial-auth — Handle partial authorization from payment terminal
 * 
 * When a card is partially approved (e.g., prepaid card with $15 balance on a $30 sale),
 * this endpoint records the partial payment and returns the remaining balance for split tender.
 * 
 * Body: {
 *   transactionId: string,
 *   approvedAmount: number,    // Amount the terminal approved
 *   requestedAmount: number,   // Amount originally requested
 *   authCode: string,          // Terminal auth code
 *   cardLast4?: string,        // Last 4 of card
 *   gatewayTxId?: string       // Terminal transaction ID
 * }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { transactionId, approvedAmount, requestedAmount, authCode, cardLast4, gatewayTxId } = body

        if (!transactionId || approvedAmount == null || requestedAmount == null) {
            return NextResponse.json({ error: 'transactionId, approvedAmount, and requestedAmount required' }, { status: 400 })
        }

        if (approvedAmount <= 0) {
            return NextResponse.json({ error: 'approvedAmount must be > 0' }, { status: 400 })
        }

        if (approvedAmount >= requestedAmount) {
            return NextResponse.json({
                fullApproval: true,
                approvedAmount,
                remainingBalance: 0,
                message: 'Full authorization — no split needed'
            })
        }

        const remainingBalance = Math.round((requestedAmount - approvedAmount) * 100) / 100

        // Record the partial payment in splits
        // (The POS will handle creating the split tender entries on the transaction)
        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'PARTIAL_AUTH', entityType: 'Transaction', entityId: transactionId,
            details: {
                requestedAmount,
                approvedAmount,
                remainingBalance,
                authCode,
                cardLast4,
                gatewayTxId,
                requiresSecondTender: true
            }
        })

        return NextResponse.json({
            fullApproval: false,
            partialAuth: true,
            approvedAmount,
            requestedAmount,
            remainingBalance,
            authCode,
            cardLast4,
            suggestedActions: [
                { method: 'CASH', label: `Pay ${remainingBalance.toFixed(2)} cash` },
                { method: 'CARD', label: 'Swipe another card' },
                { method: 'STORE_CREDIT', label: 'Apply store credit' },
                { method: 'VOID', label: 'Void partial and cancel sale' }
            ],
            message: `Card approved for $${approvedAmount.toFixed(2)} of $${requestedAmount.toFixed(2)}. Remaining balance: $${remainingBalance.toFixed(2)}`
        })
    } catch (error: any) {
        console.error('[PARTIAL_AUTH_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to process partial auth' }, { status: 500 })
    }
}
