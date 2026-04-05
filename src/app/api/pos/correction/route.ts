import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { badRequestResponse } from '@/lib/validation'
import { validateReasonCode, CORRECTION_REASON_CODES } from '@/lib/constants/reason-codes'

// ============================================================
// CORRECTION ROUTE — Ledger-Safe Late Reversal
// ============================================================
//
// POLICY:
//   This is for mistakes discovered AFTER settlement / next day.
//   Always requires manager role (OWNER / FRANCHISOR).
//   Creates a CORRECTION child transaction (negative) linked to original.
//   Original sale amounts are NEVER modified.
//   Reason code is ALWAYS required.
//   Audit severity: HIGH.
//
// ============================================================

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ===== STRICT ROLE GATE: Manager-only =====
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
    })

    const isManager = dbUser?.role === 'OWNER' || dbUser?.role === 'FRANCHISOR' ||
        user.role === 'OWNER' || user.role === 'FRANCHISOR'

    if (!isManager) {
        return NextResponse.json({
            error: 'Permission denied: Only owners and franchisors can create corrections.'
        }, { status: 403 })
    }

    try {
        const body = await req.json()
        const {
            originalTransactionId,
            correctionType,     // FULL | PARTIAL | LINE_ITEM
            items,              // [{ lineItemId, quantity }] — for PARTIAL/LINE_ITEM
            reasonCode,         // Required, from CORRECTION_REASON_CODES
            reasonNote,         // Required if reasonCode === 'OTHER'
            refundMethod,       // CASH | STORE_CREDIT | ORIGINAL_METHOD
        } = body

        // ===== VALIDATE INPUTS =====
        if (!originalTransactionId) {
            return badRequestResponse('originalTransactionId is required')
        }
        if (!correctionType || !['FULL', 'PARTIAL', 'LINE_ITEM'].includes(correctionType)) {
            return badRequestResponse('correctionType must be FULL, PARTIAL, or LINE_ITEM')
        }
        if (!reasonCode) {
            return badRequestResponse('Reason code is required for all corrections')
        }

        // Validate reason code
        const codeCheck = validateReasonCode(reasonCode, reasonNote, CORRECTION_REASON_CODES)
        if (!codeCheck.valid) return badRequestResponse(codeCheck.error)

        // ===== FETCH ORIGINAL TRANSACTION =====
        const originalTx = await prisma.transaction.findUnique({
            where: { id: originalTransactionId },
            include: { lineItems: true }
        })

        if (!originalTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Franchise scope
        if (originalTx.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // ===== GUARD: Cannot correct a correction/refund/void =====
        if (originalTx.originalTransactionId) {
            return NextResponse.json({
                error: 'Cannot correct a correction, refund, or void. Only original sales can be corrected.'
            }, { status: 400 })
        }

        // ===== GUARD: Cannot correct VOIDED transaction =====
        if (originalTx.status === 'VOIDED') {
            return NextResponse.json({
                error: 'Cannot correct a voided transaction.'
            }, { status: 400 })
        }

        // ===== Calculate remaining correctable amount =====
        const previousReversals = await prisma.transaction.findMany({
            where: {
                originalTransactionId: originalTx.id,
                type: { in: ['REFUND', 'VOID', 'CORRECTION'] }
            },
            include: { lineItems: true }
        })

        const totalPreviouslyReversed = previousReversals.reduce(
            (sum, r) => sum + Math.abs(Number(r.total)), 0
        )
        const originalPaidTotal = Math.abs(Number(originalTx.total))
        const remainingCorrectable = originalPaidTotal - totalPreviouslyReversed

        if (remainingCorrectable <= 0.01) {
            return NextResponse.json({
                error: 'This transaction has already been fully reversed (refunded/corrected/voided). No remaining amount.',
                originalTotal: originalPaidTotal,
                alreadyReversed: totalPreviouslyReversed,
            }, { status: 400 })
        }

        // ===== Calculate correction amounts =====
        let correctionSubtotal = 0
        let correctionItems: any[] = []

        if (correctionType === 'FULL') {
            // Full correction: reverse everything remaining
            correctionSubtotal = Number(originalTx.subtotal)
            correctionItems = originalTx.lineItems.map(li => ({
                type: li.type,
                serviceId: li.serviceId,
                productId: li.productId,
                quantity: -li.quantity,
                price: li.price,
                discount: li.discount,
                total: -Number(li.total),
                lineItemStatus: 'VOIDED',
                serviceNameSnapshot: li.serviceNameSnapshot,
                productNameSnapshot: li.productNameSnapshot,
            }))
        } else {
            // Partial / line-item correction
            if (!items?.length) {
                return badRequestResponse('items array required for PARTIAL or LINE_ITEM correction')
            }

            for (const corrItem of items) {
                const originalLineItem = originalTx.lineItems.find(li => li.id === corrItem.lineItemId)
                if (!originalLineItem) {
                    return badRequestResponse(`Line item ${corrItem.lineItemId} not found in original transaction`)
                }

                // Check per-item remaining
                let refundedQtySoFar = 0
                for (const prev of previousReversals) {
                    const matches = prev.lineItems.filter(pli =>
                        (pli.productId === originalLineItem.productId && originalLineItem.productId) ||
                        (pli.serviceId === originalLineItem.serviceId && originalLineItem.serviceId)
                    )
                    refundedQtySoFar += matches.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
                }

                if (refundedQtySoFar + corrItem.quantity > originalLineItem.quantity) {
                    return badRequestResponse(
                        `Cannot correct ${corrItem.quantity} items. Only ${originalLineItem.quantity - refundedQtySoFar} remaining.`
                    )
                }

                const itemTotal = Number(originalLineItem.price) * corrItem.quantity
                correctionSubtotal += itemTotal

                correctionItems.push({
                    type: originalLineItem.type,
                    serviceId: originalLineItem.serviceId,
                    productId: originalLineItem.productId,
                    quantity: -corrItem.quantity,
                    price: originalLineItem.price,
                    discount: originalLineItem.discount,
                    total: -itemTotal,
                    lineItemStatus: 'VOIDED',
                    serviceNameSnapshot: originalLineItem.serviceNameSnapshot,
                    productNameSnapshot: originalLineItem.productNameSnapshot,
                })
            }
        }

        // Proportional tax
        const taxRate = Number(originalTx.subtotal) > 0
            ? Number(originalTx.tax) / Number(originalTx.subtotal)
            : 0
        const correctionTax = correctionSubtotal * (isNaN(taxRate) ? 0 : taxRate)
        const correctionTotal = correctionSubtotal + correctionTax

        // ===== GUARD: Cannot exceed remaining =====
        if (correctionTotal > remainingCorrectable + 0.01) {
            return NextResponse.json({
                error: `Correction of $${correctionTotal.toFixed(2)} would exceed remaining correctable amount of $${remainingCorrectable.toFixed(2)}.`,
                originalTotal: originalPaidTotal,
                alreadyReversed: totalPreviouslyReversed,
                remaining: remainingCorrectable,
                requested: correctionTotal
            }, { status: 400 })
        }

        // ===== ATOMIC CORRECTION =====
        const correctionTx = await prisma.$transaction(async (tx) => {
            // 1. Create CORRECTION child transaction
            const correctionRow = await tx.transaction.create({
                data: {
                    type: 'CORRECTION',
                    franchiseId: user.franchiseId,
                    clientId: originalTx.clientId,
                    employeeId: user.id,
                    originalTransactionId: originalTx.id,
                    status: 'CORRECTED',
                    paymentMethod: refundMethod === 'ORIGINAL_METHOD'
                        ? originalTx.paymentMethod
                        : (refundMethod || originalTx.paymentMethod),
                    subtotal: -correctionSubtotal,
                    tax: -correctionTax,
                    total: -correctionTotal,
                    tip: 0,
                    discount: 0,
                    cardLast4: originalTx.cardLast4,
                    cardType: originalTx.cardType,
                    source: originalTx.source,
                    // Correction tracking
                    correctionType: 'CORRECTION',
                    correctionReasonCode: reasonCode,
                    correctionApprovedBy: user.id,
                    correctionApprovedAt: new Date(),
                    voidReason: `[CORRECTION][${reasonCode}] ${reasonNote || ''}`.trim(),
                    // Line items
                    lineItems: { create: correctionItems }
                }
            })

            // 2. Update original sale status
            const isFullyReversed = (totalPreviouslyReversed + correctionTotal) >= (originalPaidTotal - 0.01)
            await tx.transaction.update({
                where: { id: originalTx.id },
                data: { status: isFullyReversed ? 'CORRECTED' : 'PARTIALLY_REFUNDED' }
            })

            // 3. Restock inventory
            for (const item of correctionItems) {
                if (item.type === 'PRODUCT' && item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: Math.abs(item.quantity) } }
                    })
                }
            }

            // 4. Issue store credit if requested
            let storeCreditCode: string | null = null
            if (refundMethod === 'STORE_CREDIT') {
                const code = 'SC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
                await tx.giftCard.create({
                    data: {
                        franchiseId: user.franchiseId,
                        code,
                        initialAmount: correctionTotal,
                        currentBalance: correctionTotal,
                        isActive: true
                    }
                })
                storeCreditCode = code
            }

            return { ...correctionRow, storeCreditCode }
        })

        // ===== HIGH-SEVERITY AUDIT LOG =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'CORRECTION_CREATED',
            entityType: 'CORRECTION',
            entityId: correctionTx.id,
            details: {
                severity: 'HIGH',
                originalTransactionId,
                correctionType,
                correctionTotal,
                reasonCode,
                reasonNote: reasonNote || null,
                refundMethod: refundMethod || 'ORIGINAL_METHOD',
                totalPreviouslyReversed,
                remainingAfterCorrection: remainingCorrectable - correctionTotal,
                approvedBy: user.email,
                model: 'CHILD_ROW',
            }
        })

        return NextResponse.json({
            ...correctionTx,
            model: 'CHILD_ROW',
            correctedByName: user.name || user.email || 'Unknown',
        })
    } catch (error: any) {
        console.error('[POS_CORRECTION_POST]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
