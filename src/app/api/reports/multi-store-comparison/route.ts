/**
 * Multi-Store Comparison API
 *
 * GET — Compare performance across locations (for owners with multiple stores)
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get all locations for this franchise
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: { locations: { select: { id: true, name: true, address: true } } }
        })

        const locations = franchise?.locations || []

        if (locations.length === 0) {
            return NextResponse.json({ period: `Last ${days} days`, totalRevenue: 0, locationCount: 0, comparison: [] })
        }

        // Get all completed transactions for this franchise
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: since }
            },
            select: { total: true, createdAt: true, cashDrawerSessionId: true }
        })

        // Get drawer sessions to map transactions to locations
        const sessionIds = [...new Set(transactions.map(t => t.cashDrawerSessionId).filter(Boolean))] as string[]
        const drawerSessions = sessionIds.length > 0 ? await prisma.cashDrawerSession.findMany({
            where: { id: { in: sessionIds } },
            select: { id: true, locationId: true }
        }) : []
        const sessionLocationMap = new Map(drawerSessions.map(ds => [ds.id, ds.locationId]))

        // Group transactions by location
        const comparison = locations.map(loc => {
            const locTxns = transactions.filter(t => {
                if (!t.cashDrawerSessionId) return false
                return sessionLocationMap.get(t.cashDrawerSessionId) === loc.id
            })
            const revenue = locTxns.reduce((s, t) => s + Number(t.total || 0), 0)

            return {
                locationId: loc.id,
                name: loc.name,
                address: loc.address,
                revenue: Math.round(revenue * 100) / 100,
                transactions: locTxns.length,
                avgTicket: locTxns.length > 0 ? Math.round((revenue / locTxns.length) * 100) / 100 : 0,
                dailyAvgRevenue: Math.round((revenue / days) * 100) / 100
            }
        }).sort((a, b) => b.revenue - a.revenue)

        const totalRevenue = comparison.reduce((s, l) => s + l.revenue, 0)

        return NextResponse.json({
            period: `Last ${days} days`,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            locationCount: comparison.length,
            comparison
        })
    } catch (error) {
        console.error('[MULTI_STORE_GET]', error)
        return NextResponse.json({ error: 'Failed to generate comparison' }, { status: 500 })
    }
}
