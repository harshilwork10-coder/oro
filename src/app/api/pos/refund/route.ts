import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, ActionTypes } from '@/lib/auditLog'
import { badRequestResponse } from '@/lib/validation'
import { validateReasonCode, REFUND_REASON_CODES } from '@/lib/constants/reason-codes'

export async function POST(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: lookup user permissions from DB
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { canProcessRefunds: true, role: true }
    })

    // Only users with refund permission or owners/franchisors can process refunds
    const canRefund = dbUser?.canProcessRefunds ||
        dbUser?.role === 'OWNER' ||
        dbUser?.role === 'FRANCHISOR' ||
        user.role === 'OWNER' ||
        user.role === 'FRANCHISOR'

    if (!canRefund) {
        return NextResponse.json({ error: 'Permission denied: Cannot process refunds' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const {
            originalTransactionId,
            refundType,
            items,
            reason,
            reasonCode,
            reasonNote,
            refundMethod,
            cashDrawerSessionId,
            authCode,
            cardLast4,
            gatewayTxId
        } = body

        // Validate structured reason code (forward-only enforcement)
        if (reasonCode) {
            const codeCheck = validateReasonCode(reasonCode, reasonNote, REFUND_REASON_CODES)
            if (!codeCheck.valid) return badRequestResponse(codeCheck.error)
        }

        // Check shift if provided
        if (cashDrawerSessionId) {
            const sessionCheck = await prisma.cashDrawerSession.findUnique({
                where: { id: cashDrawerSessionId }
            })
            if (sessionCheck && sessionCheck.endTime) {
                return badRequestResponse('Shift is closed. Cannot process refund.')
            }
        }

        // Fetch original transaction with line items
        const originalTx = await prisma.transaction.findUnique({
            where: { id: originalTransactionId },
            include: { lineItems: true }
        })

        if (!originalTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Security: Verify transaction belongs to user's franchise
        if (originalTx.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // ===== P0 FIX: REFUND-ON-REFUND GUARD =====
        // Reject if the transaction being refunded is ITSELF a refund (has an originalTransactionId)
        if (originalTx.originalTransactionId) {
            return NextResponse.json({
                error: 'Cannot refund a refund transaction. Only original sales can be refunded.'
            }, { status: 400 })
        }

        // Check status — only COMPLETED or PARTIALLY_REFUNDED can be refunded
        if (originalTx.status !== 'COMPLETED' && originalTx.status !== 'PARTIALLY_REFUNDED') {
            return NextResponse.json({
                error: `Cannot refund transaction with status: ${originalTx.status}`
            }, { status: 400 })
        }

        // ===== S1-6: DUPLICATE REFUND TIME-WINDOW DETECTION =====
        const recentDuplicateRefund = await prisma.transaction.findFirst({
            where: {
                originalTransactionId: originalTx.id,
                status: 'REFUNDED',
                createdAt: { gte: new Date(Date.now() - 60_000) }
            }
        })
        if (recentDuplicateRefund) {
            return NextResponse.json({
                error: 'Duplicate refund detected — this transaction was just refunded. Wait 60 seconds and try again if intentional.'
            }, { status: 409 })
        }

        // ===== S1-5: REFUND APPROVAL THRESHOLDS =====
        const isManager = user.role === 'OWNER' || user.role === 'FRANCHISOR'
        if (!isManager) {
            const franchise = await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                include: { franchisor: { include: { config: true } } }
            })
            const config = franchise?.franchisor?.config as any

            if (config?.requireManagerPinAbove) {
                const threshold = Number(config.requireManagerPinAbove)
                const estimatedRefundTotal = items.reduce((sum: number, ri: any) => {
                    const origItem = originalTx.lineItems.find(li => li.id === ri.lineItemId)
                    if (origItem) return sum + Number(origItem.price) * ri.quantity
                    return sum
                }, 0)
                if (estimatedRefundTotal > threshold && !body.managerPinVerified) {
                    return NextResponse.json({
                        error: `Refund of ${estimatedRefundTotal.toFixed(2)} exceeds $${threshold.toFixed(2)} threshold. Manager PIN required.`,
                        requiresManagerPin: true,
                        threshold
                    }, { status: 403 })
                }
            }

            if (config?.refundLimitPerDay) {
                const dailyLimit = Number(config.refundLimitPerDay)
                const todayStart = new Date()
                todayStart.setHours(0, 0, 0, 0)
                const todaysRefunds = await prisma.transaction.aggregate({
                    where: {
                        employeeId: user.id,
                        status: 'REFUNDED',
                        createdAt: { gte: todayStart }
                    },
                    _sum: { total: true }
                })
                const totalRefundedToday = Math.abs(Number(todaysRefunds._sum.total || 0))
                if (totalRefundedToday >= dailyLimit) {
                    return NextResponse.json({
                        error: `Daily refund limit of $${dailyLimit.toFixed(2)} reached. Contact a manager.`,
                        dailyLimitReached: true,
                        totalRefundedToday
                    }, { status: 403 })
                }
            }
        }

        // Fetch ALL previous refunds for this original transaction
        const previousRefunds = await prisma.transaction.findMany({
            where: {
                originalTransactionId: originalTx.id,
                status: 'REFUNDED'
            },
            include: { lineItems: true }
        })

        // ===== P0 FIX: TOTAL REFUND DOLLAR-AMOUNT CEILING =====
        // Sum all previous refund totals (they are negative, so we use Math.abs)
        const totalPreviouslyRefunded = previousRefunds.reduce(
            (sum, r) => sum + Math.abs(Number(r.total)), 0
        )
        const originalPaidTotal = Math.abs(Number(originalTx.total))

        // Map requested refund items and check per-item limits
        const refundLineItems = items.map((refundItem: any) => {
            const originalLineItem = originalTx.lineItems.find(li => li.id === refundItem.lineItemId)
            if (!originalLineItem) {
                throw new Error(`Line item ${refundItem.lineItemId} not found`)
            }

            // Calculate how many have already been refunded for this product/service
            const totalOriginalQty = originalTx.lineItems
                .filter(li => li.productId === originalLineItem.productId && li.serviceId === originalLineItem.serviceId)
                .reduce((sum, li) => sum + li.quantity, 0)

            let totalRefundedSoFar = 0
            for (const prevRefund of previousRefunds) {
                const matches = prevRefund.lineItems.filter(pli =>
                    (pli.productId === originalLineItem.productId && originalLineItem.productId) ||
                    (pli.serviceId === originalLineItem.serviceId && originalLineItem.serviceId)
                )
                totalRefundedSoFar += matches.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
            }

            if (totalRefundedSoFar + refundItem.quantity > totalOriginalQty) {
                throw new Error(`Cannot refund ${refundItem.quantity} items. Only ${totalOriginalQty - totalRefundedSoFar} remaining for this item.`)
            }

            return {
                ...originalLineItem,
                quantityToRefund: refundItem.quantity
            }
        })

        // Calculate refund totals
        let refundSubtotal = 0
        const refundItems = refundLineItems.map((item: any) => {
            const itemTotal = item.price * item.quantityToRefund * (1 - (item.discount || 0) / 100)
            refundSubtotal += itemTotal
            return {
                type: item.type,
                serviceId: item.serviceId,
                productId: item.productId,
                quantity: -item.quantityToRefund, // Negative quantity for refund
                price: item.price,
                discount: item.discount || 0,
                total: -itemTotal // Negative total for refund
            }
        })

        // Calculate proportional tax
        const taxRate = Number(originalTx.tax) / Number(originalTx.subtotal)
        const refundTax = refundSubtotal * (isNaN(taxRate) ? 0 : taxRate)
        const refundTotal = refundSubtotal + refundTax

        // ===== P0 FIX: ENFORCE TOTAL REFUND <= ORIGINAL TOTAL =====
        if (totalPreviouslyRefunded + refundTotal > originalPaidTotal + 0.01) {
            return NextResponse.json({
                error: `Refund of $${refundTotal.toFixed(2)} would exceed remaining refundable amount. Original: $${originalPaidTotal.toFixed(2)}, Already refunded: $${totalPreviouslyRefunded.toFixed(2)}, Remaining: $${(originalPaidTotal - totalPreviouslyRefunded).toFixed(2)}`,
                originalTotal: originalPaidTotal,
                alreadyRefunded: totalPreviouslyRefunded,
                remaining: originalPaidTotal - totalPreviouslyRefunded,
                requested: refundTotal
            }, { status: 400 })
        }

        // ===== ATOMIC TRANSACTION BLOCK =====
        const refundTx = await prisma.$transaction(async (tx) => {
            // P0 FIX: Set type to REFUND (was defaulting to SALE)
            const refundTransaction = await tx.transaction.create({
                data: {
                    type: 'REFUND',
                    franchiseId: user.franchiseId,
                    clientId: originalTx.clientId,
                    employeeId: user.id,
                    originalTransactionId: originalTx.id,
                    status: 'REFUNDED',
                    paymentMethod: refundMethod || originalTx.paymentMethod,
                    subtotal: -refundSubtotal,
                    tax: -refundTax,
                    total: -refundTotal,
                    voidReason: reasonCode ? `[${reasonCode}] ${reasonNote || reason || ''}`.trim() : (reason || 'No reason provided'),
                    cashDrawerSessionId: cashDrawerSessionId,
                    authCode: authCode || null,
                    cardLast4: cardLast4 || originalTx.cardLast4,
                    gatewayTxId: gatewayTxId || null,
                    lineItems: {
                        create: refundItems
                    }
                }
            })

            // Update Original Transaction Status
            const allItemsRefunded = refundType === 'FULL'
            if (allItemsRefunded) {
                await tx.transaction.update({
                    where: { id: originalTx.id },
                    data: { status: 'REFUNDED' }
                })
            } else {
                await tx.transaction.update({
                    where: { id: originalTx.id },
                    data: { status: 'PARTIALLY_REFUNDED' }
                })
            }

            // Restock Inventory for refunded items
            for (const refundItem of refundLineItems) {
                if (refundItem.type === 'PRODUCT' && refundItem.productId) {
                    await tx.product.update({
                        where: { id: refundItem.productId },
                        data: { stock: { increment: refundItem.quantityToRefund } }
                    })
                }
            }

            // Issue Store Credit if refundMethod is STORE_CREDIT
            let storeCreditCode: string | null = null
            if (refundMethod === 'STORE_CREDIT') {
                const code = 'SC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
                await tx.giftCard.create({
                    data: {
                        franchiseId: user.franchiseId,
                        code,
                        initialAmount: refundTotal,
                        currentBalance: refundTotal,
                        isActive: true
                    }
                })
                storeCreditCode = code
            }

            return { ...refundTransaction, storeCreditCode }
        })
        // ===== END ATOMIC TRANSACTION BLOCK =====

        // ===== AUDIT LOG =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.REFUND_PROCESSED,
            entityType: 'REFUND',
            entityId: refundTx.id,
            details: {
                originalTransactionId,
                refundType,
                refundTotal,
                refundMethod: refundMethod || originalTx.paymentMethod,
                reasonCode: reasonCode || null,
                reasonNote: reasonNote || null,
                reason: reason || 'No reason provided',
                itemsRefunded: items.length,
                totalPreviouslyRefunded,
                remainingAfterThisRefund: originalPaidTotal - totalPreviouslyRefunded - refundTotal
            }
        })

        return NextResponse.json({ ...refundTx, storeCreditCode: refundTx.storeCreditCode || null })
    } catch (error) {
        console.error('[POS_REFUND_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
