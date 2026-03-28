import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * GET /api/owner/failed-transactions — View failed/pending/voided transactions
 *
 * Admin tool for investigating and resolving stuck transactions.
 * Owner/Manager only.
 *
 * Query params: ?status=PENDING,VOIDED&days=7&locationId=xxx
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const statusFilter = searchParams.get('status')?.split(',') || ['PENDING', 'IN_PROGRESS', 'SUSPENDED', 'VOIDED']
        const days = parseInt(searchParams.get('days') || '7')
        const locationId = searchParams.get('locationId')

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const where: any = {
            franchiseId: user.franchiseId,
            status: { in: statusFilter },
            createdAt: { gte: since },
        }
        if (locationId) where.locationId = locationId

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, email: true } },
                lineItems: { take: 5, select: { productNameSnapshot: true, serviceNameSnapshot: true, quantity: true, total: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })

        const result = transactions.map(t => ({
            id: t.id,
            status: t.status,
            total: Number(t.total),
            subtotal: Number(t.subtotal),
            tax: Number(t.tax),
            paymentMethod: t.paymentMethod,
            employee: t.employee ? { id: t.employee.id, name: t.employee.name } : null,
            itemCount: t.lineItems.length,
            items: t.lineItems.map(li => ({
                name: li.serviceNameSnapshot || li.productNameSnapshot || 'Item',
                quantity: li.quantity,
                total: Number(li.total),
            })),
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            voidReason: (t as any).voidReason || null,
        }))

        // Summary
        const summary = {
            total: result.length,
            byStatus: statusFilter.reduce((acc, s) => {
                acc[s] = result.filter(t => t.status === s).length
                return acc
            }, {} as Record<string, number>),
            totalValue: result.reduce((sum, t) => sum + t.total, 0),
        }

        return NextResponse.json({ transactions: result, summary, period: `${days}d` })
    } catch (error: any) {
        console.error('[FAILED_TX]', error)
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
}

/**
 * POST /api/owner/failed-transactions — Bulk action on failed transactions
 *
 * Body: { action: 'VOID' | 'MARK_REVIEWED', transactionIds: string[], reason: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Owner or higher required' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { action, transactionIds, reason } = body

        if (!action || !transactionIds?.length) {
            return NextResponse.json({ error: 'action and transactionIds required' }, { status: 400 })
        }

        let processed = 0

        if (action === 'VOID') {
            for (const txId of transactionIds.slice(0, 20)) {
                const tx = await prisma.transaction.findFirst({
                    where: { id: txId, franchiseId: user.franchiseId, status: { in: ['PENDING', 'IN_PROGRESS', 'SUSPENDED'] } },
                })
                if (tx) {
                    await prisma.transaction.update({
                        where: { id: txId },
                        data: { status: 'VOIDED', voidReason: reason || 'Admin bulk void' },
                    })
                    await logActivity({
                        userId: user.id, userEmail: user.email, userRole: user.role,
                        franchiseId: user.franchiseId,
                        action: 'ADMIN_BULK_VOID', entityType: 'Transaction', entityId: txId,
                        details: { reason, originalTotal: Number(tx.total), originalStatus: tx.status },
                    })
                    processed++
                }
            }
        }

        return NextResponse.json({ success: true, action, processed, total: transactionIds.length })
    } catch (error: any) {
        console.error('[FAILED_TX_POST]', error)
        return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 })
    }
}
