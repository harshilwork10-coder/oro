import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Expiry Tracking — Items expiring soon
 * GET /api/inventory/expiry-tracking?days=7
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const daysAhead = parseInt(searchParams.get('days') || '7')

    try {
        const cutoff = new Date(Date.now() + daysAhead * 86400000)

        const items = await prisma.item.findMany({
            where: {
                franchiseId: user.franchiseId, type: 'PRODUCT', isActive: true,
                expirationDate: { lte: cutoff, not: null }
            },
            select: {
                id: true, name: true, barcode: true, sku: true,
                stock: true, price: true, cost: true, expirationDate: true,
                category: { select: { name: true } }
            },
            orderBy: { expirationDate: 'asc' }
        })

        const now = Date.now()
        const report = items.map(item => {
            const daysLeft = Math.ceil((new Date(item.expirationDate!).getTime() - now) / 86400000)
            return {
                ...item, category: item.category?.name || 'Uncategorized',
                daysUntilExpiry: daysLeft,
                status: daysLeft < 0 ? 'EXPIRED' : daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
                potentialLoss: Math.round(Number(item.cost || 0) * (item.stock || 0) * 100) / 100
            }
        })

        return NextResponse.json({
            items: report,
            summary: {
                expired: report.filter(r => r.status === 'EXPIRED').length,
                critical: report.filter(r => r.status === 'CRITICAL').length,
                warning: report.filter(r => r.status === 'WARNING').length,
                totalPotentialLoss: Math.round(report.reduce((s, r) => s + r.potentialLoss, 0) * 100) / 100
            }
        })
    } catch (error: any) {
        console.error('[EXPIRY_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch expiring items' }, { status: 500 })
    }
}
