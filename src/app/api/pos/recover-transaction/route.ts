import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/pos/recover-transaction?stationId=xxx — Find interrupted/pending transactions for a station
 * POST /api/pos/recover-transaction — Resume or void an interrupted transaction
 * 
 * Body: { transactionId: string, action: 'RESUME' | 'VOID', reason?: string }
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const stationId = searchParams.get('stationId')

    try {
        // Find pending/in-progress transactions from the last 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const where: any = {
            franchiseId: user.franchiseId,
            status: { in: ['PENDING', 'IN_PROGRESS', 'SUSPENDED'] },
            createdAt: { gte: cutoff }
        }

        const pending = await prisma.transaction.findMany({
            where,
            include: {
                lineItems: { take: 5 },
                employee: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return NextResponse.json({
            transactions: pending.map(t => ({
                id: t.id,
                status: t.status,
                total: Number(t.total),
                itemCount: t.lineItems.length,
                employee: t.employee?.name,
                createdAt: t.createdAt,
                paymentMethod: t.paymentMethod,
                preview: t.lineItems.slice(0, 3).map(li => li.serviceNameSnapshot || li.productNameSnapshot || li.productId || 'Item')
            })),
            count: pending.length
        })
    } catch (error: any) {
        console.error('[RECOVER_TX_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch interrupted transactions' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { transactionId, action, reason } = body

        if (!transactionId || !action) {
            return NextResponse.json({ error: 'transactionId and action required' }, { status: 400 })
        }

        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, franchiseId: user.franchiseId },
            include: { lineItems: true }
        })
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

        if (action === 'VOID') {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'VOIDED', voidReason: reason || 'Voided via recovery — terminal disconnect' }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'TRANSACTION_RECOVERY_VOID', entityType: 'Transaction', entityId: transactionId,
                details: { reason, originalTotal: Number(tx.total), itemCount: tx.lineItems.length }
            })

            return NextResponse.json({ success: true, action: 'VOIDED', transactionId })
        }

        if (action === 'RESUME') {
            // Return full transaction data for POS to reconstruct cart
            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'TRANSACTION_RECOVERY_RESUME', entityType: 'Transaction', entityId: transactionId,
                details: { originalTotal: Number(tx.total) }
            })

            return NextResponse.json({
                success: true,
                action: 'RESUMED',
                transaction: {
                    id: tx.id,
                    status: tx.status,
                    total: Number(tx.total),
                    subtotal: Number(tx.subtotal),
                    tax: Number(tx.tax),
                    paymentMethod: tx.paymentMethod,
                    lineItems: tx.lineItems.map(li => ({
                        id: li.id,
                        name: li.serviceNameSnapshot || li.productNameSnapshot || li.productId,
                        productId: li.productId,
                        serviceId: li.serviceId,
                        quantity: li.quantity,
                        price: Number(li.price),
                        total: Number(li.total)
                    }))
                }
            })
        }

        return NextResponse.json({ error: 'action must be RESUME or VOID' }, { status: 400 })
    } catch (error: any) {
        console.error('[RECOVER_TX_POST]', error)
        return NextResponse.json({ error: error.message || 'Recovery failed' }, { status: 500 })
    }
}
