import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateBody, unauthorizedResponse, badRequestResponse } from '@/lib/validation'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { validateReasonCode, VOID_REASON_CODES } from '@/lib/constants/reason-codes'

// ============================================================
// SETTLEMENT-AWARE VOID ROUTE — Ledger-Safe Correction Model
// ============================================================
//
// POLICY:
//   Card payments: only if unsettled (captureStatus != SETTLED, < 12h)
//   Cash payments: same calendar day only
//   Creates a VOID child transaction (negative) linked to original
//   Original sale status updated to VOIDED (derived, amounts untouched)
//   Legacy voids (pre-migration) remain as status-only mutations
//
// ============================================================

const voidRequestSchema = z.object({
    transactionId: z.string().min(1, 'Transaction ID required'),
    reason: z.string().min(3, 'Void reason required (min 3 chars)').optional(),
    reasonCode: z.string().optional(),
    reasonNote: z.string().optional(),
    cashDrawerSessionId: z.string().optional(),
    managerPinVerified: z.boolean().optional(),
})

/**
 * Infer settlement status from captureStatus field + time heuristic.
 * If PAX data exists, use it. Otherwise fall back to time-based rule.
 */
function inferSettlementStatus(tx: { captureStatus?: string | null; createdAt: Date }): 'UNSETTLED' | 'LIKELY_SETTLED' | 'SETTLED' {
    if (tx.captureStatus === 'SETTLED') return 'SETTLED'
    if (tx.captureStatus === 'AUTHORIZED' || tx.captureStatus === 'CAPTURED') return 'UNSETTLED'

    // Time-based heuristic: most processors batch-settle overnight
    const hoursSinceCreation = (Date.now() - tx.createdAt.getTime()) / (1000 * 60 * 60)
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const isToday = tx.createdAt >= midnight

    if (isToday && hoursSinceCreation < 12) return 'UNSETTLED'
    return 'LIKELY_SETTLED'
}

/**
 * Check if a cash transaction is same calendar day.
 */
function isSameCalendarDay(txDate: Date): boolean {
    const today = new Date()
    return txDate.toDateString() === today.toDateString()
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return unauthorizedResponse()

    // Permission check
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { canProcessRefunds: true, role: true }
    })

    const isManager = dbUser?.role === 'OWNER' || dbUser?.role === 'FRANCHISOR' ||
        user.role === 'OWNER' || user.role === 'FRANCHISOR'
    const canVoid = dbUser?.canProcessRefunds || isManager

    if (!canVoid) {
        return NextResponse.json({ error: 'Permission denied: Cannot void transactions' }, { status: 403 })
    }

    // Validate body
    const validation = await validateBody(req, voidRequestSchema)
    if ('error' in validation) return validation.error

    const { transactionId, reason, reasonCode, reasonNote, cashDrawerSessionId, managerPinVerified } = validation.data

    // Validate reason code
    if (reasonCode) {
        const codeCheck = validateReasonCode(reasonCode, reasonNote, VOID_REASON_CODES)
        if (!codeCheck.valid) return badRequestResponse(codeCheck.error)
    }

    // Shift validation
    if (cashDrawerSessionId) {
        const sessionCheck = await prisma.cashDrawerSession.findUnique({
            where: { id: cashDrawerSessionId }
        })
        if (sessionCheck?.endTime) {
            return badRequestResponse('Shift is closed. Cannot void transaction.')
        }
    }

    try {
        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Security: franchise scope
        if (transaction.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // ===== STATUS GUARD =====
        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: `Cannot void transaction with status: ${transaction.status}`
            }, { status: 400 })
        }

        // ===== SETTLEMENT-AWARE GATING =====
        const isCash = transaction.paymentMethod === 'CASH'
        const isCard = ['CREDIT_CARD', 'DEBIT_CARD'].includes(transaction.paymentMethod)

        if (isCash) {
            // Cash: same calendar day only
            if (!isSameCalendarDay(transaction.createdAt)) {
                return NextResponse.json({
                    error: 'Cash transaction is from a previous day. Use "Correct Transaction" for late fixes.',
                    useCorrection: true
                }, { status: 400 })
            }
            // Cash voids require manager approval
            if (!isManager && !managerPinVerified) {
                return NextResponse.json({
                    error: 'Manager approval required for cash void.',
                    requiresManagerPin: true
                }, { status: 403 })
            }
        } else if (isCard) {
            // Card: settlement-aware
            const settlementStatus = inferSettlementStatus(transaction)

            if (settlementStatus === 'SETTLED') {
                return NextResponse.json({
                    error: 'This card transaction has been settled by the processor. Use Refund instead of Void.',
                    useRefund: true,
                    settlementStatus: 'SETTLED'
                }, { status: 400 })
            }
            if (settlementStatus === 'LIKELY_SETTLED') {
                return NextResponse.json({
                    error: 'This card transaction is likely settled (processed > 12 hours ago). Use Refund for safety.',
                    useRefund: true,
                    settlementStatus: 'LIKELY_SETTLED'
                }, { status: 400 })
            }
            // UNSETTLED: allow void
        } else if (transaction.paymentMethod === 'SPLIT') {
            // Split: apply same-day rule for the cash portion
            if (!isSameCalendarDay(transaction.createdAt)) {
                return NextResponse.json({
                    error: 'Split-payment transaction is from a previous day. Use "Correct Transaction" for late fixes.',
                    useCorrection: true
                }, { status: 400 })
            }
        }

        // ===== DUPLICATE VOID DETECTION =====
        const existingVoidChild = await prisma.transaction.findFirst({
            where: {
                originalTransactionId: transactionId,
                type: 'VOID'
            }
        })
        if (existingVoidChild) {
            return NextResponse.json({
                error: 'This transaction has already been voided.',
                existingVoidId: existingVoidChild.id
            }, { status: 409 })
        }

        // ===== ATOMIC VOID — CHILD ROW MODEL =====
        const voidResult = await prisma.$transaction(async (tx) => {
            // 1. Create VOID child transaction (negative mirror)
            const voidChild = await tx.transaction.create({
                data: {
                    type: 'VOID',
                    franchiseId: transaction.franchiseId,
                    clientId: transaction.clientId,
                    employeeId: user.id,
                    originalTransactionId: transaction.id,
                    status: 'VOIDED',
                    paymentMethod: transaction.paymentMethod,
                    subtotal: -Number(transaction.subtotal),
                    tax: -Number(transaction.tax),
                    tip: -Number(transaction.tip),
                    discount: Number(transaction.discount),
                    total: -Number(transaction.total),
                    cardLast4: transaction.cardLast4,
                    cardType: transaction.cardType,
                    gatewayTxId: transaction.gatewayTxId,
                    authCode: transaction.authCode,
                    captureStatus: transaction.captureStatus,
                    source: transaction.source,
                    cashDrawerSessionId: cashDrawerSessionId || null,
                    // Correction tracking
                    correctionType: 'VOID',
                    correctionReasonCode: reasonCode || null,
                    correctionApprovedBy: isManager ? user.id : null,
                    correctionApprovedAt: new Date(),
                    voidReason: reasonCode
                        ? `[${reasonCode}] ${reasonNote || reason || ''}`.trim()
                        : (reason || 'No reason provided'),
                    voidedById: user.id,
                    voidedAt: new Date(),
                    // Mirror line items as negative
                    lineItems: {
                        create: transaction.lineItems.map(li => ({
                            type: li.type,
                            productId: li.productId,
                            serviceId: li.serviceId,
                            quantity: -li.quantity,
                            price: li.price,
                            discount: li.discount,
                            total: -Number(li.total),
                            lineItemStatus: 'VOIDED',
                            serviceNameSnapshot: li.serviceNameSnapshot,
                            productNameSnapshot: li.productNameSnapshot,
                        }))
                    }
                }
            })

            // 2. Update original sale status to VOIDED (derived state, amounts untouched)
            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'VOIDED',
                    voidedById: user.id,
                    voidedAt: new Date(),
                    voidReason: reasonCode
                        ? `[${reasonCode}] ${reasonNote || reason || ''}`.trim()
                        : (reason || 'No reason provided'),
                }
            })

            // 3. Restock inventory atomically
            for (const item of transaction.lineItems) {
                if (item.type === 'PRODUCT' && item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    })
                }
            }

            return voidChild
        })

        // ===== AUDIT LOG =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.VOID_TRANSACTION,
            entityType: 'TRANSACTION',
            entityId: voidResult.id,
            details: {
                originalTransactionId: transaction.id,
                originalTotal: Number(transaction.total),
                voidTotal: Number(voidResult.total),
                reasonCode: reasonCode || null,
                reasonNote: reasonNote || null,
                reason: reason || 'No reason provided',
                paymentMethod: transaction.paymentMethod,
                captureStatus: transaction.captureStatus || 'UNKNOWN',
                model: 'CHILD_ROW',
            }
        })

        return NextResponse.json({
            ...voidResult,
            voidedByName: user.name || user.email || 'Unknown',
            model: 'CHILD_ROW',
        })
    } catch (error: any) {
        console.error('[POS_VOID_POST]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
