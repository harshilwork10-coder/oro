import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateBody, unauthorizedResponse, badRequestResponse } from '@/lib/validation'
import { logActivity, ActionTypes } from '@/lib/auditLog'

// Validation schema
const voidRequestSchema = z.object({
    transactionId: z.string().min(1, 'Transaction ID required'),
    reason: z.string().min(3, 'Void reason required (min 3 chars)').optional(),
    cashDrawerSessionId: z.string().optional()
})

export async function POST(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return unauthorizedResponse()
    }

    // SECURITY: Permission check - lookup user permissions from DB
    // Using canProcessRefunds for both refunds and voids (financial reversal permission)
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { canProcessRefunds: true, role: true }
    })

    // Only users with refund/void permission or owners/franchisors can void transactions
    const canVoid = dbUser?.canProcessRefunds ||
        dbUser?.role === 'OWNER' ||
        dbUser?.role === 'FRANCHISOR' ||
        user.role === 'OWNER' ||
        user.role === 'FRANCHISOR'

    if (!canVoid) {
        return NextResponse.json({ error: 'Permission denied: Cannot void transactions' }, { status: 403 })
    }

    // Validate request body
    const validation = await validateBody(req, voidRequestSchema)
    if ('error' in validation) return validation.error

    const { transactionId, reason, cashDrawerSessionId } = validation.data

    // Shift validation (OPTIONAL - matches transaction behavior)
    // Only validate if cashDrawerSessionId is provided
    if (cashDrawerSessionId) {
        const sessionCheck = await prisma.cashDrawerSession.findUnique({
            where: { id: cashDrawerSessionId }
        })
        if (sessionCheck && sessionCheck.endTime) {
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

        // Security: Verify transaction belongs to user's franchise
        if (transaction.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Check if transaction can be voided
        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: `Cannot void transaction with status: ${transaction.status}`
            }, { status: 400 })
        }

        // ===== ATOMIC VOID BLOCK =====
        // Update status AND restock inventory atomically
        const voidedTransaction = await prisma.$transaction(async (tx) => {
            // 1. Update Transaction Status
            const updatedTx = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'VOIDED',
                    voidedById: user.id,
                    voidedAt: new Date(),
                    voidReason: reason || null
                },
                include: {
                    employee: {
                        select: { name: true, email: true }
                    }
                }
            })

            // 2. Restock Inventory
            for (const item of transaction.lineItems) {
                if (item.type === 'PRODUCT' && item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    })
                }
            }

            return updatedTx
        })
        // ===== END ATOMIC VOID BLOCK =====

        // ===== AUDIT LOG - Record void for legal protection =====
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: ActionTypes.VOID_TRANSACTION,
            entityType: 'TRANSACTION',
            entityId: voidedTransaction.id,
            details: {
                originalTotal: transaction.total,
                reason: reason || 'No reason provided',
            }
        })
        // =============================================================

        return NextResponse.json({
            ...voidedTransaction,
            voidedByName: user.name || user.email || 'Unknown'
        })
    } catch (error: any) {
        console.error('[POS_VOID_POST]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}

