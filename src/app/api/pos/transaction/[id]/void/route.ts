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
            where: { id: transactionId }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: 'Can only void completed transactions'
            }, { status: 400 })
        }

        // Mark as voided (reason logged to console for audit)
        console.log(`[VOID_TRANSACTION] User: ${session.user.name} (${session.user.id}) voided transaction ${transactionId}. Reason: ${reason}`)
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'VOIDED' }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_VOID]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
