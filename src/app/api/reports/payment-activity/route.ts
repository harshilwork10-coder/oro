/**
 * Payment Activity Log API
 *
 * GET — View webhook-received payment events (Stripe/Square)
 * Separate from PAX in-person transactions — this tracks processor events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') // STRIPE | SQUARE | all
    const type = searchParams.get('type') // PAYMENT | REFUND | DISPUTE | PAYOUT
    const status = searchParams.get('status')
    const days = parseInt(searchParams.get('days') || '30')

    const since = new Date()
    since.setDate(since.getDate() - days)

    const where: any = { createdAt: { gte: since } }
    if (provider && provider !== 'all') where.provider = provider
    if (type) where.type = type
    if (status) where.status = status

    const logs = await prisma.paymentLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
    })

    // Summary stats
    const payments = logs.filter(l => l.type === 'PAYMENT' && l.status === 'SUCCEEDED')
    const refunds = logs.filter(l => l.type === 'REFUND')
    const disputes = logs.filter(l => l.type === 'DISPUTE')
    const payouts = logs.filter(l => l.type === 'PAYOUT')

    return NextResponse.json({
        data: {
            summary: {
                totalPayments: payments.length,
                paymentVolume: payments.reduce((s, l) => s + Number(l.amount), 0),
                totalRefunds: refunds.length,
                refundVolume: refunds.reduce((s, l) => s + Number(l.amount), 0),
                openDisputes: disputes.filter(d => d.status === 'DISPUTE_OPEN').length,
                totalPayouts: payouts.length,
                payoutVolume: payouts.reduce((s, l) => s + Number(l.amount), 0),
            },
            logs,
        },
    })
}
