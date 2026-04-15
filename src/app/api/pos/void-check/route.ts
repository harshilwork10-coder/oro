import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Void Check — Pre-check if cashier can void/refund (daily limits)
 * POST /api/pos/void-check
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { amount, type } = body as { amount: number; type: 'VOID' | 'REFUND' }

        if (!amount || !type) return NextResponse.json({ error: 'amount and type required' }, { status: 400 })

        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) return NextResponse.json({ allowed: true, reason: 'No limits set' })

        const limit = type === 'VOID'
            ? (settings as any).voidLimitPerDay ? Number((settings as any).voidLimitPerDay) : null
            : (settings as any).refundLimitPerDay ? Number((settings as any).refundLimitPerDay) : null

        const requirePin = (settings as any).requireManagerPinAbove
            ? Number((settings as any).requireManagerPinAbove)
            : null

        if (!limit && !requirePin) {
            return NextResponse.json({ allowed: true, reason: 'No limits configured' })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayTx = await prisma.transaction.findMany({
            where: {
                employeeId: user.id,
                status: type === 'VOID' ? 'VOIDED' : 'REFUNDED',
                createdAt: { gte: today }
            },
            select: { total: true }
        })

        const todayTotal = todayTx.reduce((s, t) => s + Number(t.total || 0), 0)
        const newTotal = todayTotal + Number(amount)
        const exceedsLimit = limit !== null && newTotal > limit
        const needsPin = requirePin !== null && Number(amount) > requirePin

        return NextResponse.json({
            allowed: !exceedsLimit,
            needsManagerPin: needsPin,
            todayTotal: Math.round(todayTotal * 100) / 100,
            dailyLimit: limit,
            remaining: limit !== null ? Math.max(0, limit - todayTotal) : null,
            reason: exceedsLimit
                ? `Daily ${type.toLowerCase()} limit exceeded ($${limit?.toFixed(2)})`
                : needsPin
                    ? `Amount exceeds $${requirePin?.toFixed(2)} — manager PIN required`
                    : 'Allowed'
        })
    } catch (error: any) {
        console.error('[VOID_CHECK_POST]', error)
        return NextResponse.json({ error: 'Failed to check void limits' }, { status: 500 })
    }
}
