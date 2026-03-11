/**
 * Multi-Store Comparison API
 *
 * GET — Compare performance across locations (for owners with multiple stores)
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get all locations for this franchise
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: { locations: { select: { id: true, name: true, address: true } } }
        })

        const locations = franchise?.locations || []

        if (locations.length === 0) {
            return ApiResponse.success({ period: `Last ${days} days`, totalRevenue: 0, locationCount: 0, comparison: [] })
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

        return ApiResponse.success({
            period: `Last ${days} days`,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            locationCount: comparison.length,
            comparison
        })
    } catch (error) {
        console.error('[MULTI_STORE_GET]', error)
        return ApiResponse.error('Failed to generate comparison', 500)
    }
}
