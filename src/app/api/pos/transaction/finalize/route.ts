import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/invoice'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { z } from 'zod'
import {
    calculateTransactionPayouts,
    getBusinessDate,
    DEFAULT_PAYOUT_CONFIG,
    type LineItemInput
} from '@/lib/payoutEngine'
import { unauthorizedResponse, badRequestResponse, validateBody } from '@/lib/validation'

/**
 * Sprint 1: Finalize Transaction (Phase 2 of card checkout)
 * POST /api/pos/transaction/finalize
 *
 * Converts a RESERVED PendingTransaction into a final Transaction + TransactionLineItems
 * using ONLY the server-owned snapshots sealed at reserve time.
 *
 * The client provides ONLY:
 *   - pendingTransactionId (from reserve response)
 *   - PAX/processor response fields (gatewayTxId, authCode, cardLast4, cardType)
 *
 * The client does NOT provide:
 *   - line items
 *   - prices
 *   - discounts
 *   - totals
 *   - promotions
 *   - age verification
 *
 * All of those are rehydrated from PendingTransaction.cartSnapshot/totalsSnapshot/promoSnapshot.
 *
 * Atomic guarantees:
 *   - Compare-and-set (CAS) claim: RESERVED → FINALIZING (only one caller wins)
 *   - Transaction + LineItems created
 *   - Product inventory decremented + StockAdjustment audit records
 *   - AgeVerificationSession consumed (prevents replay)
 *   - PendingTransaction marked FINALIZED
 *   - If ANY step fails, NOTHING is committed (prisma.$transaction rollback)
 *   - CAS rollback: FINALIZING reverts to RESERVED on failure
 */

const finalizeRequestSchema = z.object({
    pendingTransactionId: z.string().min(1, 'pendingTransactionId required'),

    // PAX / processor response fields
    gatewayTxId: z.string().min(1, 'gatewayTxId required'),
    authCode: z.string().optional().nullable(),
    cardLast4: z.string().optional().nullable(),
    cardType: z.string().optional().nullable(),

    // Optional: terminal metadata
    terminalId: z.string().optional().nullable(),
    entryMode: z.string().optional().nullable(), // CHIP, SWIPE, TAP, MANUAL
})

// Type for the rehydrated cart snapshot items
interface CartSnapshotItem {
    id: string | null
    type: 'SERVICE' | 'PRODUCT'
    name: string
    dbPrice: number
    clientPrice: number
    cashPrice: number
    cardPrice: number | null
    quantity: number
    discount: number
    lineTotal: number
    categoryId: string | null
    categoryName: string | null
    ageRestricted: boolean
    barberId: string | null
    itemDescription: string | null
    isGlobal?: boolean
}

interface TotalsSnapshot {
    subtotal: number
    promoDiscount: number
    adjustedSubtotal: number
    tip: number
    chargedMode: string
    serverItemCount: number
    serverUnitCount: number
}

interface PromoSnapshotItem {
    promotionId: string
    promotionName: string
    type: string
    discountAmount: number
    affectedItems: string[]
    ruleSnapshot: Record<string, unknown>
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return unauthorizedResponse()
    }

    const validation = await validateBody(req, finalizeRequestSchema)
    if ('error' in validation) return validation.error

    const {
        pendingTransactionId,
        gatewayTxId, authCode, cardLast4, cardType,
        terminalId, entryMode,
    } = validation.data

    try {
        // ===== 1. LOAD AND VALIDATE PENDING TRANSACTION =====
        const pendingTx = await prisma.pendingTransaction.findUnique({
            where: { id: pendingTransactionId }
        })

        if (!pendingTx) {
            return badRequestResponse('Pending transaction not found.')
        }

        // Franchise scope check
        if (pendingTx.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // ===== DUPLICATE FINALIZE SAFETY =====
        // If this pending transaction was already finalized, return the existing transaction
        if (pendingTx.status === 'FINALIZED' && pendingTx.finalizedTransactionId) {
            const existingTx = await prisma.transaction.findUnique({
                where: { id: pendingTx.finalizedTransactionId },
                include: {
                    lineItems: {
                        select: {
                            id: true, type: true, quantity: true, price: true, total: true,
                            serviceNameSnapshot: true, productNameSnapshot: true,
                            cashUnitPrice: true, cardUnitPrice: true,
                            cashLineTotal: true, cardLineTotal: true, lineChargedMode: true,
                            priceCharged: true, discount: true, staffId: true,
                            serviceId: true, productId: true,
                            promotionId: true, promotionName: true, promotionDiscount: true,
                        }
                    },
                    client: {
                        select: { id: true, firstName: true, lastName: true, phone: true, email: true }
                    }
                }
            })

            if (existingTx) {
                return NextResponse.json({
                    ...existingTx,
                    _finalizeDuplicate: true,
                    _message: 'Transaction already finalized. Returning existing record.',
                })
            }
        }

        // FINALIZING = another request claimed it but hasn't committed yet.
        // Tell the caller to retry shortly — the other request will either succeed or rollback.
        if (pendingTx.status === 'FINALIZING') {
            return NextResponse.json({
                error: 'This transaction is currently being finalized by another request. Retry in a few seconds.',
                pendingTransactionId: pendingTx.id,
                status: 'FINALIZING',
                retryable: true,
            }, { status: 409 })
        }

        // Reject non-RESERVED states
        if (pendingTx.status !== 'RESERVED') {
            return badRequestResponse(
                `Cannot finalize: pending transaction is ${pendingTx.status}. Only RESERVED transactions can be finalized.`
            )
        }

        // Expiry check
        if (pendingTx.expiresAt < new Date()) {
            // Mark as expired for future reference
            await prisma.pendingTransaction.update({
                where: { id: pendingTx.id },
                data: { status: 'EXPIRED' }
            })
            return badRequestResponse(
                'Pending transaction expired. The reservation window has closed. Please re-submit the order through reserve.'
            )
        }

        // ===== 2. REHYDRATE FROM SERVER SNAPSHOTS =====
        let cartItems: CartSnapshotItem[]
        let totals: TotalsSnapshot
        let promos: PromoSnapshotItem[]

        try {
            cartItems = JSON.parse(pendingTx.cartSnapshot)
            totals = JSON.parse(pendingTx.totalsSnapshot)
            promos = pendingTx.promoSnapshot ? JSON.parse(pendingTx.promoSnapshot) : []
        } catch (parseError) {
            console.error('[FINALIZE] Failed to parse snapshots:', parseError)
            return NextResponse.json({
                error: 'Internal error: corrupted pending transaction snapshots. Contact support.',
            }, { status: 500 })
        }

        // ===== 3. PREPARE PAYOUT ENGINE DATA FROM SNAPSHOT =====
        const businessDate = getBusinessDate()

        const employeeCompPlan = await prisma.compensationPlan.findFirst({
            where: { userId: pendingTx.employeeId, effectiveTo: null },
            orderBy: { effectiveFrom: 'desc' },
            select: { commissionSplit: true }
        })
        const actualCommissionSplit = employeeCompPlan?.commissionSplit
            ? Number(employeeCompPlan.commissionSplit)
            : 0

        const payoutConfig: typeof DEFAULT_PAYOUT_CONFIG = {
            ...DEFAULT_PAYOUT_CONFIG,
            commissionSplit: actualCommissionSplit,
            taxRate: 0, // TODO: Pass actual tax rate from franchise config
        }

        // Build payout engine inputs from server snapshot (NOT client data)
        const lineItemInputs: LineItemInput[] = cartItems.map(item => ({
            type: item.type as 'SERVICE' | 'PRODUCT',
            price: item.dbPrice, // SERVER price from snapshot
            quantity: item.quantity,
            discount: item.dbPrice * item.quantity * (item.discount / 100), // Convert % to $
            serviceId: item.type === 'SERVICE' ? item.id : null,
            serviceName: item.type === 'SERVICE' ? item.name : null,
            productId: item.type === 'PRODUCT' ? item.id : null,
            productName: item.type === 'PRODUCT' ? item.name : null,
            barberId: item.barberId || null,
        }))

        const tipAmount = Number(pendingTx.tip) || 0
        const payoutResult = calculateTransactionPayouts(
            lineItemInputs,
            tipAmount,
            payoutConfig,
            businessDate
        )

        // Build per-line promo allocation map from snapshot
        const linePromoMap = new Map<string, { promotionId: string; promotionName: string; promotionDiscount: number }>()
        for (const promo of promos) {
            const perItemDiscount = promo.discountAmount / Math.max(promo.affectedItems.length, 1)
            for (const itemId of promo.affectedItems) {
                const existing = linePromoMap.get(itemId)
                if (!existing || perItemDiscount > existing.promotionDiscount) {
                    linePromoMap.set(itemId, {
                        promotionId: promo.promotionId,
                        promotionName: promo.promotionName,
                        promotionDiscount: Math.round(perItemDiscount * 100) / 100,
                    })
                }
            }
        }

        // ===== 4. GENERATE INVOICE NUMBER =====
        const invoiceNumber = await generateInvoiceNumber(user.franchiseId)

        // ===== 5. ATOMIC FINALIZATION BLOCK =====
        // Everything happens inside one prisma.$transaction.
        // If ANY step fails, NOTHING is committed.
        const chargedMode = pendingTx.chargedMode || 'CARD'
        const serverSubtotal = totals.subtotal
        const serverPromoDiscount = totals.promoDiscount || 0
        const expectedTotal = Number(pendingTx.expectedTotal)

        const finalTransaction = await prisma.$transaction(async (tx) => {
            // ===== ATOMIC CAS CLAIM: RESERVED → FINALIZING =====
            // This is the race-safe gate. updateMany with WHERE status='RESERVED'
            // ensures only ONE concurrent caller can claim this PendingTransaction.
            // If another request already claimed it (status is now FINALIZING or FINALIZED),
            // count=0 and we abort safely — no duplicate Transaction, no double stock decrement.
            const claimed = await tx.pendingTransaction.updateMany({
                where: {
                    id: pendingTx.id,
                    status: 'RESERVED', // CAS condition: only claim if still RESERVED
                },
                data: {
                    status: 'FINALIZING', // Intermediate state — rolled back on failure
                }
            })

            if (claimed.count === 0) {
                // Another request won the race — this caller lost
                throw new Error('FINALIZE_RACE_LOST: PendingTransaction already claimed by another concurrent request.')
            }
            // ===== END ATOMIC CAS CLAIM =====

            // ── Build line item data from snapshot ──
            const lineItemsData = cartItems.map((item, index) => {
                const snapshot = payoutResult.lineItemSnapshots[index]
                const itemSubtotal = item.dbPrice * item.quantity
                const discountAmount = itemSubtotal * (item.discount / 100)
                const itemTotal = itemSubtotal - discountAmount

                const resolvedName = snapshot.serviceNameSnapshot || snapshot.productNameSnapshot || item.name
                if (!resolvedName) {
                    throw new Error(`Item at index ${index} has no name. Cannot finalize.`)
                }

                // Dual pricing: use card prices from snapshot
                const cashUnitPrice = item.cashPrice
                const cardUnitPrice = item.cardPrice
                const cashLineTotal = cashUnitPrice * item.quantity
                const cardLineTotal = cardUnitPrice !== null ? cardUnitPrice * item.quantity : null

                // Promo evidence from server snapshot
                const promoData = item.id ? linePromoMap.get(item.id) : null

                return {
                    type: item.type,
                    serviceId: (item.type === 'SERVICE' && item.id && !item.isGlobal && !item.id.startsWith('custom') && !item.id.startsWith('open')) ? item.id : null,
                    productId: (item.type === 'PRODUCT' && item.id && !item.id.startsWith('custom') && !item.id.startsWith('open') && !item.id.startsWith('p')) ? item.id : null,
                    staffId: item.barberId || null,
                    quantity: item.quantity,
                    price: item.dbPrice.toString(),
                    discount: (item.discount || 0).toString(),
                    total: itemTotal.toString(),
                    // Dual pricing
                    cashUnitPrice: cashUnitPrice.toString(),
                    cardUnitPrice: cardUnitPrice !== null ? cardUnitPrice.toString() : null,
                    cashLineTotal: cashLineTotal.toString(),
                    cardLineTotal: cardLineTotal !== null ? cardLineTotal.toString() : null,
                    lineChargedMode: chargedMode,
                    // Payout engine snapshots
                    serviceNameSnapshot: item.type === 'SERVICE' ? resolvedName : null,
                    productNameSnapshot: item.type === 'PRODUCT' ? resolvedName : null,
                    priceCharged: snapshot.priceCharged.toString(),
                    discountAllocated: snapshot.discountAllocated.toString(),
                    taxAllocated: snapshot.taxAllocated.toString(),
                    tipAllocated: snapshot.tipAllocated.toString(),
                    commissionSplitUsed: snapshot.commissionSplitUsed.toString(),
                    commissionAmount: snapshot.commissionAmount.toString(),
                    ownerAmount: snapshot.ownerAmount.toString(),
                    businessDate: snapshot.businessDate,
                    lineItemStatus: snapshot.lineItemStatus,
                    // Sprint 1: Server promo evidence
                    promotionId: promoData?.promotionId || null,
                    promotionName: promoData?.promotionName || null,
                    promotionDiscount: promoData ? promoData.promotionDiscount.toString() : null,
                }
            })

            // ── Create the final Transaction ──
            // Resolve locationId from the authenticated user (set during pairing/onboarding)
            const resolvedLocationId = user.locationId || null

            const newTransaction = await tx.transaction.create({
                data: {
                    invoiceNumber,
                    franchiseId: pendingTx.franchiseId,
                    employeeId: pendingTx.employeeId,
                    locationId: resolvedLocationId,
                    clientId: pendingTx.clientId || null,
                    subtotal: serverSubtotal.toString(),
                    tax: '0', // TODO: Compute from tax config
                    total: expectedTotal.toString(),
                    // Dual pricing totals
                    subtotalCash: serverSubtotal.toString(),
                    subtotalCard: serverSubtotal.toString(),
                    taxCash: '0',
                    taxCard: '0',
                    totalCash: expectedTotal.toString(),
                    totalCard: expectedTotal.toString(),
                    chargedMode,
                    paymentMethod: pendingTx.paymentMethod,
                    cashAmount: '0',
                    cardAmount: expectedTotal.toString(),
                    gatewayTxId,
                    authCode: authCode || null,
                    cardLast4: cardLast4 || null,
                    cardType: cardType || null,
                    tip: tipAmount.toString(),
                    status: 'COMPLETED',
                    source: 'WEB_POS',
                    cashDrawerSessionId: pendingTx.cashDrawerSessionId || null,
                    // Sprint 1: Server-computed promotion evidence
                    appliedPromotions: promos.length > 0 ? JSON.stringify(promos) : null,
                    promoDiscount: serverPromoDiscount > 0 ? serverPromoDiscount.toString() : null,
                    ageVerificationSessionId: pendingTx.ageVerificationSessionId || null,
                    // Line items from server snapshot
                    lineItems: { create: lineItemsData },
                },
                include: {
                    lineItems: {
                        select: {
                            id: true, type: true, quantity: true, price: true, total: true,
                            serviceNameSnapshot: true, productNameSnapshot: true,
                            cashUnitPrice: true, cardUnitPrice: true,
                            cashLineTotal: true, cardLineTotal: true, lineChargedMode: true,
                            priceCharged: true, discount: true, staffId: true,
                            serviceId: true, productId: true,
                            promotionId: true, promotionName: true, promotionDiscount: true,
                        }
                    },
                    client: {
                        select: { id: true, firstName: true, lastName: true, phone: true, email: true }
                    }
                }
            })

            // ── Decrement Product inventory + create StockAdjustment audit ──
            for (const item of cartItems) {
                if (item.type === 'PRODUCT' && item.id
                    && !item.id.startsWith('p') && !item.id.startsWith('custom') && !item.id.startsWith('open')) {
                    // Re-fetch current stock inside the transaction for accurate audit
                    const currentProduct = await tx.product.findUnique({
                        where: { id: item.id },
                        select: { stock: true }
                    })

                    if (currentProduct && currentProduct.stock !== null && currentProduct.stock !== undefined) {
                        await tx.product.update({
                            where: { id: item.id },
                            data: { stock: { decrement: item.quantity } }
                        })

                        await tx.stockAdjustment.create({
                            data: {
                                productId: item.id,
                                locationId: resolvedLocationId || pendingTx.franchiseId,
                                quantity: -item.quantity,
                                reason: 'SALE',
                                sourceId: newTransaction.id,
                                previousStock: currentProduct.stock,
                                newStock: currentProduct.stock - item.quantity,
                                performedBy: pendingTx.employeeId,
                            }
                        })
                    }
                }
            }

            // ── Consume AgeVerificationSession atomically ──
            if (pendingTx.ageVerificationSessionId) {
                await tx.ageVerificationSession.update({
                    where: { id: pendingTx.ageVerificationSessionId },
                    data: {
                        consumed: true,
                        consumedByTransactionId: newTransaction.id,
                    }
                })
            }

            // ── Mark PendingTransaction as FINALIZED (from FINALIZING) ──
            await tx.pendingTransaction.update({
                where: { id: pendingTx.id },
                data: {
                    status: 'FINALIZED', // Final state — FINALIZING → FINALIZED
                    finalizedTransactionId: newTransaction.id,
                    gatewayTxId,
                    authCode: authCode || null,
                    cardLast4: cardLast4 || null,
                    cardType: cardType || null,
                }
            })

            return newTransaction
        })
        // ===== END ATOMIC FINALIZATION BLOCK =====

        // ===== AUDIT LOG =====
        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.SALE_COMPLETED,
            entityType: 'TRANSACTION', entityId: finalTransaction.id,
            details: {
                invoiceNumber: finalTransaction.invoiceNumber,
                total: expectedTotal,
                paymentMethod: pendingTx.paymentMethod,
                itemCount: cartItems.length,
                tip: tipAmount,
                clientId: pendingTx.clientId || null,
                cardLast4: cardLast4 || null,
                gatewayTxId,
                pendingTransactionId: pendingTx.id,
                source: 'FINALIZE_FLOW',
                promoCount: promos.length,
                promoDiscount: serverPromoDiscount,
                ageSessionConsumed: !!pendingTx.ageVerificationSessionId,
            }
        })

        // ===== RESPONSE =====
        return NextResponse.json({
            ...finalTransaction,
            _pendingTransactionId: pendingTx.id,
            _finalizedVia: 'reserve-finalize',
        })

    } catch (error: any) {
        // Handle CAS race loss gracefully
        if (error.message?.includes('FINALIZE_RACE_LOST')) {
            // The other caller won. Check if it finished:
            const raceCheck = await prisma.pendingTransaction.findUnique({
                where: { id: pendingTransactionId },
                select: { status: true, finalizedTransactionId: true }
            })
            if (raceCheck?.status === 'FINALIZED' && raceCheck.finalizedTransactionId) {
                const existingTx = await prisma.transaction.findUnique({
                    where: { id: raceCheck.finalizedTransactionId },
                    include: {
                        lineItems: {
                            select: {
                                id: true, type: true, quantity: true, price: true, total: true,
                                serviceNameSnapshot: true, productNameSnapshot: true,
                                promotionId: true, promotionName: true, promotionDiscount: true,
                            }
                        },
                        client: {
                            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
                        }
                    }
                })
                if (existingTx) {
                    return NextResponse.json({
                        ...existingTx,
                        _finalizeDuplicate: true,
                        _message: 'Another request finalized this transaction. Returning existing record.',
                    })
                }
            }
            // Other caller is still in progress or failed
            return NextResponse.json({
                error: 'Another finalize request is in progress for this transaction. Retry shortly.',
                pendingTransactionId,
                retryable: true,
            }, { status: 409 })
        }

        console.error('[FINALIZE_TRANSACTION]', error.code, error.message, error.meta)
        return NextResponse.json({
            error: 'Failed to finalize transaction. The pending reservation is still intact. Retry safely.',
            debug: {
                code: error.code || 'UNKNOWN',
                message: error.message?.slice(0, 300) || 'No message',
            }
        }, { status: 500 })
    }
}
