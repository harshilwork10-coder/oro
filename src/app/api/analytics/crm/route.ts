/**
 * Customer CRM Analytics API
 *
 * GET — Aggregate customer metrics: totals, new clients, top spenders,
 *       visit frequency, and retention rate
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.error('No franchise', 400)

        const franchiseId = user.franchiseId
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)

        const [totalClients, newClients, activeClientIds, topSpenders] = await Promise.all([
            prisma.client.count({ where: { franchiseId } }),

            prisma.client.count({
                where: { franchiseId, createdAt: { gte: since } }
            }),

            // Active clients = clients with completed transactions this period
            prisma.transaction.findMany({
                where: {
                    franchiseId,
                    status: 'COMPLETED',
                    createdAt: { gte: since },
                    clientId: { not: null }
                },
                select: { clientId: true, total: true },
            }),

            // Top 10 spenders (all time)
            prisma.transaction.groupBy({
                by: ['clientId'],
                where: {
                    franchiseId,
                    status: 'COMPLETED',
                    clientId: { not: null }
                },
                _sum: { total: true },
                _count: { _all: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 10
            })
        ])

        // Count unique active clients
        const uniqueActiveClients = new Set(activeClientIds.map(t => t.clientId).filter(Boolean))
        const activeCount = uniqueActiveClients.size
        const totalRevFromActive = activeClientIds.reduce((s, t) => s + Number(t.total || 0), 0)

        // Get names for top spenders
        const topIds = topSpenders.map(s => s.clientId).filter(Boolean) as string[]
        const clients = topIds.length > 0
            ? await prisma.client.findMany({
                where: { id: { in: topIds } },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true }
            })
            : []
        const nameMap = new Map(clients.map(c => [c.id, c]))

        return ApiResponse.success({
            overview: {
                totalClients,
                newClients,
                activeClients: activeCount,
                retentionRate: totalClients > 0 ? Math.round((activeCount / totalClients) * 100) : 0,
                avgSpendPerClient: activeCount > 0 ? Math.round((totalRevFromActive / activeCount) * 100) / 100 : 0
            },
            topSpenders: topSpenders.map(s => {
                const client = nameMap.get(s.clientId!)
                return {
                    clientId: s.clientId,
                    name: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email || client.phone : 'Unknown',
                    totalSpend: Math.round(Number(s._sum?.total || 0) * 100) / 100,
                    visitCount: s._count?._all || 0
                }
            }),
            periodDays: days
        })
    } catch (error) {
        console.error('[CRM_ANALYTICS]', error)
        return ApiResponse.error('Failed to generate CRM analytics', 500)
    }
}
