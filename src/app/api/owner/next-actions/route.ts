import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/next-actions — Aggregated actionable items for owner dashboard
 * Combines: low stock, expiring deals, shifts with variance, pending approvals
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')

    try {
        const now = new Date()
        const actions: { type: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; title: string; description: string; link?: string }[] = []

        // 1. Low stock items
        const lowStockCount = await prisma.item.count({
            where: {
                franchiseId: user.franchiseId, isActive: true, type: 'PRODUCT',
                stock: { lte: 5 }, parLevel: { not: null }
            }
        })
        if (lowStockCount > 0) {
            actions.push({ type: 'LOW_STOCK', priority: 'HIGH', title: `${lowStockCount} items below par level`, description: 'Review auto-reorder suggestions', link: '/dashboard/inventory/auto-reorder' })
        }

        // 2. Unresolved drawer variances (last 7 days)
        const varianceSessions = await prisma.cashDrawerSession.count({
            where: {
                status: 'CLOSED',
                variance: { not: null },
                updatedAt: { gte: new Date(now.getTime() - 7 * 86400000) },
                notes: { not: { contains: 'VARIANCE APPROVED' } }
            }
        })
        if (varianceSessions > 0) {
            actions.push({ type: 'VARIANCE', priority: 'HIGH', title: `${varianceSessions} drawer variance(s) pending approval`, description: 'Review and approve/investigate', link: '/dashboard/pos/drawer-discrepancy' })
        }

        // 3. Pending purchase orders
        const pendingPOs = await prisma.purchaseOrder.count({
            where: { location: { franchiseId: user.franchiseId }, status: 'DRAFT' }
        })
        if (pendingPOs > 0) {
            actions.push({ type: 'PENDING_PO', priority: 'MEDIUM', title: `${pendingPOs} draft purchase order(s)`, description: 'Review and submit to suppliers', link: '/dashboard/inventory/purchase-orders' })
        }

        // 4. Recent price changes (significant)
        const recentPriceChanges = await prisma.priceChangeLog.count({
            where: { franchiseId: user.franchiseId, createdAt: { gte: new Date(now.getTime() - 86400000) } }
        })
        if (recentPriceChanges > 0) {
            actions.push({ type: 'PRICE_CHANGE', priority: 'LOW', title: `${recentPriceChanges} price change(s) today`, description: 'Review for accuracy', link: '/dashboard/inventory/cost-history' })
        }

        // Sort by priority
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

        return NextResponse.json({ actions, count: actions.length })
    } catch (error: any) {
        console.error('[NEXT_ACTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to generate next actions' }, { status: 500 })
    }
}
