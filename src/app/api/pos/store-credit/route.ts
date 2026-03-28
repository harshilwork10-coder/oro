import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/store-credit — Issue store credit (from return, goodwill, rain check)
 * GET /api/pos/store-credit — Lookup store credit by code or customer
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { customerId, amount, reason, expiresInDays } = body

        if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount required' }, { status: 400 })

        const code = 'SC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()

        const credit = await prisma.giftCard.create({
            data: {
                franchiseId: user.franchiseId,
                code,
                initialBalance: amount,
                currentBalance: amount,
                type: 'STORE_CREDIT',
                issuedById: user.id,
                customerId: customerId || null,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
                notes: reason || 'Store credit issued',
                isActive: true
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'STORE_CREDIT_ISSUED', entityType: 'GiftCard', entityId: credit.id,
            details: { amount, reason, code, customerId }
        })

        return NextResponse.json({ storeCredit: credit }, { status: 201 })
    } catch (error: any) {
        console.error('[STORE_CREDIT_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to issue store credit' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const customerId = searchParams.get('customerId')

    try {
        const where: any = { franchiseId: user.franchiseId, type: 'STORE_CREDIT' }
        if (code) where.code = code
        if (customerId) where.customerId = customerId

        const credits = await prisma.giftCard.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        const totalBalance = credits.reduce((s, c) => s + Number(c.currentBalance || 0), 0)

        return NextResponse.json({ credits, totalBalance })
    } catch (error: any) {
        console.error('[STORE_CREDIT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch store credits' }, { status: 500 })
    }
}
