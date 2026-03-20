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

        // Security: Verify transaction belongs to user's franchise
        if (transaction.franchiseId !== session.user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_VOID]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
