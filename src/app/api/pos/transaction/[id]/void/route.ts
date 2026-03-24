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
            where: { id: transactionId, franchiseId: session.user.franchiseId }
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
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'VOIDED',
                voidedById: (session.user as any).id,
                voidedAt: new Date(),
                voidReason: reason,
            }
        })

        // Audit log
        await auditLog({
            userId: (session.user as any).id,
            userEmail: session.user.email,
            userRole: (session.user as any).role,
            action: 'VOID_TRANSACTION',
            entityType: 'Transaction',
            entityId: transactionId,
            franchiseId: session.user.franchiseId,
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
