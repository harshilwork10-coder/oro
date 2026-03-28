import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * House Account — Store tab for business customers
 * POST /api/pos/house-account — Charge or pay
 * GET /api/pos/house-account?customerId=xxx — Balance + history
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, customerId, transactionId, amount, notes } = body

        if (action === 'CHARGE') {
            if (!customerId || !amount) return NextResponse.json({ error: 'customerId and amount required' }, { status: 400 })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'HOUSE_ACCOUNT_CHARGE', entityType: 'HouseAccount', entityId: customerId,
                details: { amount, transactionId, notes }
            })

            return NextResponse.json({
                success: true, type: 'CHARGE', customerId, amount,
                timestamp: new Date().toISOString()
            })
        }

        if (action === 'PAYMENT') {
            if (!customerId || !amount) return NextResponse.json({ error: 'customerId and amount required' }, { status: 400 })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'HOUSE_ACCOUNT_PAYMENT', entityType: 'HouseAccount', entityId: customerId,
                details: { amount: -Math.abs(amount), notes: notes || 'Payment received' }
            })

            return NextResponse.json({
                success: true, type: 'PAYMENT', customerId,
                amount: -Math.abs(amount),
                timestamp: new Date().toISOString()
            })
        }

        return NextResponse.json({ error: 'action (CHARGE or PAYMENT) required' }, { status: 400 })
    } catch (error: any) {
        console.error('[HOUSE_ACCOUNT_POST]', error)
        return NextResponse.json({ error: 'Failed to process house account' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')

    try {
        // Get house account transactions from audit log
        const where: any = {
            franchiseId: user.franchiseId,
            action: { in: ['HOUSE_ACCOUNT_CHARGE', 'HOUSE_ACCOUNT_PAYMENT'] }
        }
        if (customerId) where.entityId = customerId

        const entries = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        const parsed = entries.map(e => {
            const data = e.changes ? JSON.parse(e.changes) : {}
            return {
                id: e.id, customerId: e.entityId,
                type: e.action === 'HOUSE_ACCOUNT_CHARGE' ? 'CHARGE' : 'PAYMENT',
                amount: data.amount, notes: data.notes,
                createdBy: e.userEmail, createdAt: e.createdAt
            }
        })

        if (customerId) {
            const balance = parsed.reduce((s, e) => s + Number(e.amount || 0), 0)
            return NextResponse.json({ customerId, balance: Math.round(balance * 100) / 100, entries: parsed })
        }

        // All accounts with balances
        const balMap = new Map<string, number>()
        for (const e of parsed) {
            balMap.set(e.customerId, (balMap.get(e.customerId) || 0) + Number(e.amount || 0))
        }
        const accounts = Array.from(balMap.entries())
            .filter(([, bal]) => Math.abs(bal) > 0.01)
            .map(([id, bal]) => ({ customerId: id, balance: Math.round(bal * 100) / 100 }))
            .sort((a, b) => b.balance - a.balance)

        return NextResponse.json({ accounts, totalOutstanding: accounts.reduce((s, a) => s + Math.max(0, a.balance), 0) })
    } catch (error: any) {
        console.error('[HOUSE_ACCOUNT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch house accounts' }, { status: 500 })
    }
}
