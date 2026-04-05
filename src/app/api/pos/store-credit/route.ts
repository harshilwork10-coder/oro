import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/pos/store-credit — Issue store credit (from return, goodwill, rain check)
 * 
 * Uses the GiftCard model with actual schema fields:
 *   - code: unique identifier
 *   - franchiseId: scoping
 *   - initialAmount: amount at creation
 *   - currentBalance: spendable balance
 *   - purchaserId: optional customer link
 *   - recipientEmail: optional
 *   - isActive: boolean
 *   - expiresAt: optional expiry
 * 
 * NOTE: The GiftCard model does NOT have 'type', 'issuedById', 'customerId', 'notes', or 'initialBalance'.
 * Store credits are distinguished from gift cards by their code prefix: 'SC-'
 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { customerId, amount, reason, expiresInDays } = body

        if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
        if (amount > 10000) return NextResponse.json({ error: 'Store credit cannot exceed $10,000' }, { status: 400 })

        const code = 'SC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()

        // Use ONLY fields that exist in the GiftCard schema
        const credit = await prisma.giftCard.create({
            data: {
                franchiseId: user.franchiseId,
                code,
                initialAmount: amount,
                currentBalance: amount,
                purchaserId: customerId || null,
                recipientEmail: null,
                isActive: true,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'STORE_CREDIT_ISSUED', entityType: 'GiftCard', entityId: credit.id,
            details: {
                amount,
                reason: reason || 'Store credit issued',
                code,
                customerId: customerId || null,
                issuedBy: user.id,
                issuedByName: user.name || user.email,
                expiresInDays: expiresInDays || null
            }
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
        // Store credits are GiftCards with code starting with 'SC-'
        const where: any = {
            franchiseId: user.franchiseId,
            code: { startsWith: 'SC-' }
        }
        if (code) where.code = code
        if (customerId) where.purchaserId = customerId

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
