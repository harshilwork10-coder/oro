import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
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
            where: { id: transactionId, franchiseId: session.user.franchiseId },
            include: { lineItems: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // ═══════════════════════════════════════════════════════════════════════
        // POS COMPLIANCE: Transaction Immutability (Industry Standard)
        // Transactions are financial records - they CANNOT be deleted.
        // Instead, we VOID them which marks them as cancelled but preserves
        // the audit trail.
        // ═══════════════════════════════════════════════════════════════════════

        // Check if already voided or refunded
        if (transaction.status === 'VOIDED') {
            return NextResponse.json({
                error: 'Transaction is already voided.'
            }, { status: 400 })
        }

        if (transaction.status === 'REFUNDED' || transaction.status === 'PARTIALLY_REFUNDED') {
            return NextResponse.json({
                error: 'Cannot void a refunded transaction.'
            }, { status: 400 })
        }

        // Void the transaction instead of deleting
        const voidedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'VOIDED',
                voidedById: session.user.id,
                voidedAt: new Date(),
                voidReason: reason
            }
        })

        // Audit log
        await auditLog({
            userId: session.user.id,
            userEmail: session.user.email,
            userRole: (session.user as any).role,
            action: 'VOID_TRANSACTION',
            entityType: 'Transaction',
            entityId: transactionId,
            franchiseId: session.user.franchiseId,
            metadata: { reason, originalStatus: transaction.status, total: Number(transaction.total), via: 'delete-endpoint' }
        })

        return NextResponse.json({
            success: true,
            message: 'Transaction voided successfully',
            transaction: {
                id: voidedTransaction.id,
                status: voidedTransaction.status
            }
        })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_VOID]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
