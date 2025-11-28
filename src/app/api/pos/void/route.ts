import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { transactionId } = body

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { lineItems: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Check if transaction can be voided
        if (transaction.status !== 'COMPLETED') {
            return NextResponse.json({
                error: `Cannot void transaction with status: ${transaction.status}`
            }, { status: 400 })
        }

        // Update transaction status to VOID
        const voidedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'VOID' }
        })

        return NextResponse.json(voidedTransaction)
    } catch (error: any) {
        console.error('[POS_VOID_POST]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
