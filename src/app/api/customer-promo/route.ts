import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Check if customer has active promo (called when customer selected at POS)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const clientId = searchParams.get('clientId')
        const phone = searchParams.get('phone')

        if (!clientId && !phone) {
            return NextResponse.json({ error: 'clientId or phone required' }, { status: 400 })
        }

        // Find client by ID or phone
        const client = await prisma.client.findFirst({
            where: clientId ? { id: clientId } : { phone: phone! }
        })

        if (!client) {
            return NextResponse.json({ activePromo: null })
        }

        // Find active, non-expired promo
        const now = new Date()
        const activePromo = await prisma.customerPromo.findFirst({
            where: {
                clientId: client.id,
                status: 'ACTIVE',
                expiresAt: { gt: now }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!activePromo) {
            return NextResponse.json({ activePromo: null })
        }

        return NextResponse.json({
            activePromo: {
                id: activePromo.id,
                ruleName: activePromo.ruleName,
                ruleType: activePromo.ruleType,
                discountType: activePromo.discountType,
                discountValue: Number(activePromo.discountValue),
                expiresAt: activePromo.expiresAt,
                excludeFromLoyalty: activePromo.excludeFromLoyalty
            }
        })
    } catch (error) {
        console.error('Error checking promo:', error)
        return NextResponse.json({ error: 'Failed to check promo' }, { status: 500 })
    }
}

// POST - Redeem promo (called at checkout)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { promoId, transactionId } = body

        if (!promoId) {
            return NextResponse.json({ error: 'promoId required' }, { status: 400 })
        }

        // Security: Verify promo belongs to user's franchise
        const existingPromo = await prisma.customerPromo.findUnique({
            where: { id: promoId },
            select: { franchiseId: true, status: true }
        })

        if (!existingPromo) {
            return NextResponse.json({ error: 'Promo not found' }, { status: 404 })
        }

        if (existingPromo.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (existingPromo.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Promo already redeemed or expired' }, { status: 400 })
        }

        // Mark promo as redeemed
        const promo = await prisma.customerPromo.update({
            where: { id: promoId },
            data: {
                status: 'REDEEMED',
                redeemedAt: new Date()
            }
        })

        // Update rule stats
        await prisma.smsMarketingRule.updateMany({
            where: {
                franchiseId: promo.franchiseId,
                ruleType: promo.ruleType
            },
            data: { redeemedCount: { increment: 1 } }
        })

        return NextResponse.json({
            success: true,
            message: 'Promo redeemed successfully'
        })
    } catch (error) {
        console.error('Error redeeming promo:', error)
        return NextResponse.json({ error: 'Failed to redeem promo' }, { status: 500 })
    }
}
