import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (transaction.franchiseId !== session.user.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // ═══════════════════════════════════════════════════════════════════════
        // POS COMPLIANCE: Transaction Immutability (Industry Standard)
        // Transactions are financial records - they CANNOT be deleted.
        // You can only: VOID (before close), REFUND (after settle), or ARCHIVE
        // See: pos_transaction_standards.md
        // ═══════════════════════════════════════════════════════════════════════

        // ALL transactions are protected once created - no hard deletes allowed
        const protectedStatuses = ['COMPLETED', 'REFUNDED', 'VOIDED', 'PENDING', 'PARTIALLY_REFUNDED']
        if (protectedStatuses.includes(transaction.status)) {
            return NextResponse.json({
                error: `Transactions cannot be deleted - they are immutable financial records. Use Void (same day) or Refund (after settlement) instead.`
            }, { status: 400 })
        }

        // Also prevent deletion if this transaction has refund children
        const hasRefunds = await prisma.transaction.count({
            where: { originalTransactionId: transactionId }
        })
        if (hasRefunds > 0) {
            return NextResponse.json({
                error: 'Cannot delete transaction with associated refunds.'
            }, { status: 400 })
        }
        // ═══════════════════════════════════════════════════════════════════════

        // Log deletion
        // Debug log removed deleting transaction ${transactionId}. Reason: ${reason}`)

        // Delete line items first (due to foreign key constraint)
        await prisma.transactionLineItem.deleteMany({
            where: { transactionId }
        })

        // Delete transaction
        await prisma.transaction.delete({
            where: { id: transactionId }
        })

        return NextResponse.json({
            success: true,
            message: 'Transaction deleted successfully'
        })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_DELETE]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
