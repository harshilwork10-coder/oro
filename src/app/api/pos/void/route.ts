import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { transactionId, reason } = body

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

        // Update transaction status to VOIDED with audit trail
        const voidedTransaction = await prisma.transaction.update({
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
