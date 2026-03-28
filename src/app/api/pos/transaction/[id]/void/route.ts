import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const transactionId = id
        const { reason } = await req.json()

        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
        }

        // Find the transaction — scoped to franchise
        const transaction = await prisma.transaction.findFirst({
            where: { id: transactionId, franchiseId: user.franchiseId }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: 'Can only void completed transactions'
            }, { status: 400 })
        }

        // Mark as voided with who did it and when
        // Also restock inventory for voided items
        const transaction_with_items = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        await prisma.$transaction(async (tx) => {
            // Update transaction status
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'VOIDED',
                    voidedById: user.id,
                    voidedAt: new Date(),
                    voidReason: reason,
                }
            })

            // Restock inventory for voided product items
            if (transaction_with_items?.lineItems) {
                for (const item of transaction_with_items.lineItems) {
                    if (item.type === 'PRODUCT' && item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        })
                    }
                }
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'VOID_TRANSACTION',
            entityType: 'Transaction',
            entityId: transactionId,
            franchiseId: user.franchiseId,
            metadata: { reason, originalStatus: transaction.status, total: Number(transaction.total) }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_VOID]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
