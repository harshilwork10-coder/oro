import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const transactionId = id

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        // Check if transaction is recent (within 24 hours)
        const hoursSinceCreation = (Date.now() - new Date(transaction.createdAt).getTime()) / (1000 * 60 * 60)
        if (hoursSinceCreation > 24) {
            return NextResponse.json({
                error: 'Cannot delete transactions older than 24 hours'
            }, { status: 400 })
        }

        // Soft delete - mark as deleted instead of actually removing
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'DELETED' }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POS_TRANSACTION_DELETE]', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
