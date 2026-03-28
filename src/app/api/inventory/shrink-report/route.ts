import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SHRINK_REASONS = ['DAMAGED', 'SPOILED', 'SHRINK', 'EXPIRED']

/**
 * GET /api/inventory/shrink-report?from=2026-01-01&to=2026-12-31&locationId=xxx
 * Dashboard report showing shrink by category, reason, time period
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = searchParams.get('to') || new Date().toISOString()
    const locationId = searchParams.get('locationId')

    try {
        const where: any = {
            reason: { in: SHRINK_REASONS },
            quantity: { lt: 0 },
            createdAt: { gte: new Date(from), lte: new Date(to) }
        }
        if (locationId) where.locationId = locationId

        const adjustments = await (prisma.stockAdjustment as any).findMany({
            where,
            include: {
                product: { select: { name: true, sku: true } },
                location: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Aggregate by reason
        const byReason: Record<string, { count: number, totalUnits: number, items: string[] }> = {}
        for (const adj of adjustments) {
            if (!byReason[adj.reason]) byReason[adj.reason] = { count: 0, totalUnits: 0, items: [] }
            byReason[adj.reason].count++
            byReason[adj.reason].totalUnits += Math.abs(adj.quantity)
            const name = adj.product?.name || 'Unknown'
            if (!byReason[adj.reason].items.includes(name)) byReason[adj.reason].items.push(name)
        }

        // Aggregate by category
        const byCategory: Record<string, { count: number, totalUnits: number }> = {}
        for (const adj of adjustments) {
            const cat = adj.product?.category?.name || 'Uncategorized'
            if (!byCategory[cat]) byCategory[cat] = { count: 0, totalUnits: 0 }
            byCategory[cat].count++
            byCategory[cat].totalUnits += Math.abs(adj.quantity)
        }

        // Aggregate by location
        const byLocation: Record<string, { count: number, totalUnits: number, locationName: string }> = {}
        for (const adj of adjustments) {
            if (!byLocation[adj.locationId]) byLocation[adj.locationId] = { count: 0, totalUnits: 0, locationName: adj.location?.name || 'Unknown' }
            byLocation[adj.locationId].count++
            byLocation[adj.locationId].totalUnits += Math.abs(adj.quantity)
        }

        // Top shrink items
        const itemTotals: Record<string, { name: string, totalUnits: number, reasons: string[] }> = {}
        for (const adj of adjustments) {
            const pid = adj.productId
            if (!itemTotals[pid]) itemTotals[pid] = { name: adj.product?.name || 'Unknown', totalUnits: 0, reasons: [] }
            itemTotals[pid].totalUnits += Math.abs(adj.quantity)
            if (!itemTotals[pid].reasons.includes(adj.reason)) itemTotals[pid].reasons.push(adj.reason)
        }
        const topShrinkItems = Object.values(itemTotals).sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 20)

        const totalShrinkUnits = adjustments.reduce((s: number, a: any) => s + Math.abs(a.quantity), 0)

        return NextResponse.json({
            period: { from, to },
            totalAdjustments: adjustments.length,
            totalShrinkUnits,
            byReason,
            byCategory,
            byLocation: Object.values(byLocation),
            topShrinkItems,
            recentAdjustments: adjustments.slice(0, 25).map((a: any) => ({
                id: a.id,
                productName: a.product?.name,
                quantity: a.quantity,
                reason: a.reason,
                notes: a.notes,
                locationName: a.location?.name,
                createdAt: a.createdAt
            }))
        })
    } catch (error: any) {
        console.error('[SHRINK_REPORT]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
