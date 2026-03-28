import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/pricing-alerts — Recent significant price changes
 * Query: ?locationId=xxx&days=7
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const since = new Date()
    since.setDate(since.getDate() - days)

    try {
        const changes = await prisma.priceChangeLog.findMany({
            where: { franchiseId: user.franchiseId, createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { product: { select: { name: true, barcode: true } } }
        })

        const alerts = changes.map(c => {
            const oldPrice = Number(c.oldPrice)
            const newPrice = Number(c.newPrice)
            const pctChange = oldPrice > 0 ? Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100 : 0
            return {
                id: c.id,
                productName: c.product?.name || c.productId,
                barcode: c.product?.barcode,
                oldPrice, newPrice, pctChange,
                changedBy: c.changedBy,
                createdAt: c.createdAt,
                isSignificant: Math.abs(pctChange) >= 10
            }
        })

        return NextResponse.json({
            alerts,
            summary: {
                totalChanges: alerts.length,
                significantChanges: alerts.filter(a => a.isSignificant).length,
                avgChange: alerts.length > 0 ? Math.round(alerts.reduce((s, a) => s + a.pctChange, 0) / alerts.length * 100) / 100 : 0
            }
        })
    } catch (error: any) {
        console.error('[PRICING_ALERTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch pricing alerts' }, { status: 500 })
    }
}
