import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'
import { z } from 'zod'
import { unauthorizedResponse, badRequestResponse, validateBody } from '@/lib/validation'

/**
 * Sprint 1: Transaction Recovery Route
 * POST /api/pos/recover-transaction
 *
 * Manager/operator safety net for interrupted PAX flows.
 * Uses server-owned PendingTransaction rows — never trusts client cart/pricing for recovery.
 *
 * Recovery scenarios:
 *   - PAX approved, app crashed before finalize call
 *   - Network failure during finalize request
 *   - Operator unsure whether payment completed
 *   - Stale RESERVED rows that need manager action
 *
 * Supported actions:
 *   LIST     — Show all recoverable PendingTransactions for this franchise
 *   VIEW     — Show one PendingTransaction's sealed snapshot details
 *   FINALIZE — Complete a stuck RESERVED transaction (delegates to finalize route's CAS flow)
 *   VOID     — Explicitly void/expire a PendingTransaction (requires manager role)
 *   EXPIRE   — Bulk expire all RESERVED transactions past their expiresAt
 *
 * State machine reference:
 *   RESERVED   → recoverable (can finalize or void)
 *   FINALIZING → in-progress (retry shortly)
 *   FINALIZED  → completed (view-only)
 *   EXPIRED    → dead (view-only, can be cleaned up)
 *   VOIDED     → dead (manager-voided, triggers manual PAX refund if needed)
 *
 * Permission model:
 *   - LIST/VIEW: Any authenticated POS user within the franchise
 *   - FINALIZE: Any authenticated POS user (delegates to finalize flow)
 *   - VOID: OWNER, MANAGER, ADMIN, FRANCHISOR, PROVIDER only (or manager PIN)
 *   - EXPIRE: OWNER, MANAGER, ADMIN, FRANCHISOR, PROVIDER only
 */

const MANAGER_ROLES = ['OWNER', 'MANAGER', 'ADMIN', 'FRANCHISOR', 'PROVIDER']

const recoveryRequestSchema = z.object({
    action: z.enum(['LIST', 'VIEW', 'FINALIZE', 'VOID', 'EXPIRE']),
    pendingTransactionId: z.string().optional(),

    // For FINALIZE action — PAX/processor response
    gatewayTxId: z.string().optional(),
    authCode: z.string().optional().nullable(),
    cardLast4: z.string().optional().nullable(),
    cardType: z.string().optional().nullable(),

    // For VOID action — audit trail
    voidReason: z.string().optional(),
    managerPin: z.string().optional(),

    // For LIST filtering
    statusFilter: z.enum(['RESERVED', 'FINALIZING', 'FINALIZED', 'EXPIRED', 'VOIDED', 'ALL']).optional().default('RESERVED'),
})

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return unauthorizedResponse()
    }

    const validation = await validateBody(req, recoveryRequestSchema)
    if ('error' in validation) return validation.error

    const { action } = validation.data

    try {

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: LIST — Show recoverable pending transactions
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'LIST') {
            const statusFilter = validation.data.statusFilter || 'RESERVED'
            const whereClause: any = { franchiseId: user.franchiseId }

            if (statusFilter !== 'ALL') {
                whereClause.status = statusFilter
            }

            const pendingTransactions = await prisma.pendingTransaction.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    employeeId: true,
                    status: true,
                    paymentMethod: true,
                    expectedTotal: true,
                    tip: true,
                    chargedMode: true,
                    stationId: true,
                    clientId: true,
                    ageVerificationSessionId: true,
                    gatewayTxId: true,
                    cardLast4: true,
                    cardType: true,
                    finalizedTransactionId: true,
                    expiresAt: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })

            // Enrich with employee names and stale detection
            const now = new Date()
            const enriched = await Promise.all(pendingTransactions.map(async (pt) => {
                const employee = await prisma.user.findUnique({
                    where: { id: pt.employeeId },
                    select: { name: true, email: true }
                })

                const isExpired = pt.expiresAt < now && pt.status === 'RESERVED'
                const isRecoverable = pt.status === 'RESERVED' && !isExpired

                return {
                    ...pt,
                    expectedTotal: Number(pt.expectedTotal),
                    tip: Number(pt.tip),
                    employeeName: employee?.name || 'Unknown',
                    employeeEmail: employee?.email || '',
                    isExpired,
                    isRecoverable,
                    isInProgress: pt.status === 'FINALIZING',
                    isCompleted: pt.status === 'FINALIZED',
                    minutesAge: Math.round((now.getTime() - pt.createdAt.getTime()) / 60000),
                    minutesUntilExpiry: isExpired ? 0 : Math.round((pt.expiresAt.getTime() - now.getTime()) / 60000),
                }
            }))

            return NextResponse.json({
                pendingTransactions: enriched,
                total: enriched.length,
                recoverable: enriched.filter(e => e.isRecoverable).length,
                inProgress: enriched.filter(e => e.isInProgress).length,
                completed: enriched.filter(e => e.isCompleted).length,
                expired: enriched.filter(e => e.isExpired).length,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: VIEW — Show one pending transaction's sealed snapshot
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'VIEW') {
            const { pendingTransactionId } = validation.data
            if (!pendingTransactionId) {
                return badRequestResponse('pendingTransactionId required for VIEW action.')
            }

            const pendingTx = await prisma.pendingTransaction.findFirst({
                where: { id: pendingTransactionId, franchiseId: user.franchiseId }
            })

            if (!pendingTx) {
                return NextResponse.json({ error: 'Pending transaction not found.' }, { status: 404 })
            }

            // Parse snapshots for display
            let cartItems = []
            let totals = {}
            let promos = []
            try {
                cartItems = JSON.parse(pendingTx.cartSnapshot)
                totals = JSON.parse(pendingTx.totalsSnapshot)
                promos = pendingTx.promoSnapshot ? JSON.parse(pendingTx.promoSnapshot) : []
            } catch { /* snapshots corrupted — return raw */ }

            const employee = await prisma.user.findUnique({
                where: { id: pendingTx.employeeId },
                select: { name: true, email: true }
            })

            const now = new Date()
            const isExpired = pendingTx.expiresAt < now && pendingTx.status === 'RESERVED'

            return NextResponse.json({
                id: pendingTx.id,
                status: pendingTx.status,
                paymentMethod: pendingTx.paymentMethod,
                expectedTotal: Number(pendingTx.expectedTotal),
                tip: Number(pendingTx.tip),
                chargedMode: pendingTx.chargedMode,
                employeeId: pendingTx.employeeId,
                employeeName: employee?.name || 'Unknown',
                clientId: pendingTx.clientId,
                stationId: pendingTx.stationId,
                ageVerificationSessionId: pendingTx.ageVerificationSessionId,
                // PAX response (if any — filled by prior finalize attempt)
                gatewayTxId: pendingTx.gatewayTxId,
                authCode: pendingTx.authCode,
                cardLast4: pendingTx.cardLast4,
                cardType: pendingTx.cardType,
                finalizedTransactionId: pendingTx.finalizedTransactionId,
                // Server-owned snapshots (read-only display)
                cart: cartItems,
                totals,
                promotions: promos,
                // Timing
                expiresAt: pendingTx.expiresAt.toISOString(),
                createdAt: pendingTx.createdAt.toISOString(),
                isExpired,
                isRecoverable: pendingTx.status === 'RESERVED' && !isExpired,
                minutesAge: Math.round((now.getTime() - pendingTx.createdAt.getTime()) / 60000),
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: FINALIZE — Complete a stuck RESERVED transaction
        // Delegates to the finalize route's atomic CAS flow.
        // Does NOT duplicate finalize logic — calls the real finalize endpoint.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'FINALIZE') {
            const { pendingTransactionId, gatewayTxId } = validation.data
            if (!pendingTransactionId) {
                return badRequestResponse('pendingTransactionId required for FINALIZE action.')
            }
            if (!gatewayTxId) {
                return badRequestResponse('gatewayTxId required to finalize. Check PAX terminal for the approved transaction reference.')
            }

            // Validate the pending transaction exists and is recoverable
            const pendingTx = await prisma.pendingTransaction.findFirst({
                where: { id: pendingTransactionId, franchiseId: user.franchiseId }
            })

            if (!pendingTx) {
                return NextResponse.json({ error: 'Pending transaction not found.' }, { status: 404 })
            }

            if (pendingTx.status === 'FINALIZED' && pendingTx.finalizedTransactionId) {
                // Already complete — return the existing transaction
                const existingTx = await prisma.transaction.findUnique({
                    where: { id: pendingTx.finalizedTransactionId },
                    include: {
                        lineItems: {
                            select: {
                                id: true, type: true, quantity: true, price: true, total: true,
                                serviceNameSnapshot: true, productNameSnapshot: true,
                            }
                        }
                    }
                })
                return NextResponse.json({
                    ...(existingTx || {}),
                    _recoveredDuplicate: true,
                    _message: 'Transaction was already finalized.',
                })
            }

            if (pendingTx.status !== 'RESERVED') {
                return badRequestResponse(
                    `Cannot finalize from recovery: status is ${pendingTx.status}. Only RESERVED transactions can be finalized.`
                )
            }

            // Delegate to the finalize endpoint via internal fetch.
            // This ensures the atomic CAS claim, snapshot rehydration, stock decrement,
            // age session consume, and audit logging all happen through the same codepath.
            // No finalize logic is duplicated in this recovery route.
            const protocol = req.headers.get('x-forwarded-proto') || 'http'
            const host = req.headers.get('host') || 'localhost:3000'
            const finalizeUrl = `${protocol}://${host}/api/pos/transaction/finalize`

            const finalizeResponse = await fetch(finalizeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Forward auth headers so finalize can authenticate
                    ...(req.headers.get('authorization') ? { 'Authorization': req.headers.get('authorization')! } : {}),
                    ...(req.headers.get('cookie') ? { 'Cookie': req.headers.get('cookie')! } : {}),
                    ...(req.headers.get('x-station-id') ? { 'x-station-id': req.headers.get('x-station-id')! } : {}),
                },
                body: JSON.stringify({
                    pendingTransactionId,
                    gatewayTxId,
                    authCode: validation.data.authCode || null,
                    cardLast4: validation.data.cardLast4 || null,
                    cardType: validation.data.cardType || null,
                }),
            })

            const finalizeResult = await finalizeResponse.json()

            // Log recovery action
            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'TRANSACTION_RECOVERED',
                entityType: 'PendingTransaction', entityId: pendingTransactionId,
                details: {
                    gatewayTxId,
                    finalizeStatus: finalizeResponse.status,
                    recoveredBy: user.id,
                    originalEmployee: pendingTx.employeeId,
                    expectedTotal: Number(pendingTx.expectedTotal),
                }
            })

            if (!finalizeResponse.ok) {
                return NextResponse.json({
                    error: 'Recovery finalize failed.',
                    finalizeError: finalizeResult,
                    pendingTransactionId,
                    suggestion: finalizeResponse.status === 409
                        ? 'Another finalize is in progress. Retry in a few seconds.'
                        : 'Check PAX terminal status and retry.',
                }, { status: finalizeResponse.status })
            }

            return NextResponse.json({
                ...finalizeResult,
                _recoveredVia: 'recover-transaction',
                _recoveredBy: user.id,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: VOID — Manager explicitly voids a pending transaction
        // Used when operator confirms payment should NOT be completed.
        // If PAX already approved, operator must manually void on the terminal.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'VOID') {
            // Permission check: manager or higher only
            if (!MANAGER_ROLES.includes(user.role)) {
                const { managerPin } = validation.data
                if (!managerPin) {
                    return NextResponse.json({
                        error: 'VOID action requires OWNER/MANAGER role or a valid manager PIN.',
                    }, { status: 403 })
                }

                const manager = await prisma.user.findFirst({
                    where: {
                        franchiseId: user.franchiseId,
                        pin: managerPin,
                        role: { in: MANAGER_ROLES },
                        isActive: true,
                    },
                    select: { id: true, name: true, role: true }
                })

                if (!manager) {
                    return NextResponse.json({ error: 'Invalid manager PIN.' }, { status: 403 })
                }
            }

            const { pendingTransactionId, voidReason } = validation.data
            if (!pendingTransactionId) {
                return badRequestResponse('pendingTransactionId required for VOID action.')
            }

            const pendingTx = await prisma.pendingTransaction.findFirst({
                where: { id: pendingTransactionId, franchiseId: user.franchiseId }
            })

            if (!pendingTx) {
                return NextResponse.json({ error: 'Pending transaction not found.' }, { status: 404 })
            }

            if (pendingTx.status === 'FINALIZED') {
                return badRequestResponse(
                    'Cannot void: transaction was already finalized. Use the standard void/refund flow on the completed transaction.'
                )
            }

            if (pendingTx.status === 'VOIDED') {
                return NextResponse.json({
                    voided: true,
                    pendingTransactionId: pendingTx.id,
                    _message: 'Already voided.',
                })
            }

            // Void the pending transaction
            await prisma.pendingTransaction.update({
                where: { id: pendingTx.id },
                data: { status: 'VOIDED' }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'PENDING_TRANSACTION_VOIDED',
                entityType: 'PendingTransaction', entityId: pendingTx.id,
                details: {
                    voidReason: voidReason || 'Manager voided pending reservation',
                    expectedTotal: Number(pendingTx.expectedTotal),
                    paymentMethod: pendingTx.paymentMethod,
                    originalEmployee: pendingTx.employeeId,
                    gatewayTxId: pendingTx.gatewayTxId || null,
                    hadPaxApproval: !!pendingTx.gatewayTxId,
                    note: pendingTx.gatewayTxId
                        ? 'WARNING: PAX may have approved this charge. Operator must manually void on the terminal.'
                        : 'No PAX approval recorded. Safe to void without terminal action.',
                }
            })

            return NextResponse.json({
                voided: true,
                pendingTransactionId: pendingTx.id,
                hadPaxApproval: !!pendingTx.gatewayTxId,
                warning: pendingTx.gatewayTxId
                    ? 'PAX may have approved this charge. Please void the transaction directly on the PAX terminal to prevent the customer from being charged.'
                    : null,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: EXPIRE — Bulk expire stale RESERVED transactions
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'EXPIRE') {
            if (!MANAGER_ROLES.includes(user.role)) {
                return NextResponse.json({ error: 'EXPIRE action requires manager role.' }, { status: 403 })
            }

            const now = new Date()
            const result = await prisma.pendingTransaction.updateMany({
                where: {
                    franchiseId: user.franchiseId,
                    status: 'RESERVED',
                    expiresAt: { lt: now },
                },
                data: { status: 'EXPIRED' }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'PENDING_TRANSACTIONS_BULK_EXPIRED',
                entityType: 'PendingTransaction', entityId: 'bulk',
                details: { expiredCount: result.count }
            })

            return NextResponse.json({
                expired: true,
                expiredCount: result.count,
            })
        }

        return badRequestResponse(`Invalid action: '${action}'. Use LIST, VIEW, FINALIZE, VOID, or EXPIRE.`)

    } catch (error: any) {
        console.error('[RECOVER_TRANSACTION]', error.code, error.message)
        return NextResponse.json({
            error: 'Recovery operation failed.',
            debug: {
                code: error.code || 'UNKNOWN',
                message: error.message?.slice(0, 300) || 'No message',
            }
        }, { status: 500 })
    }
}
