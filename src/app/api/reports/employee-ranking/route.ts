'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Employee sales ranking (leaderboard)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Group sales by employee
        const salesData = await prisma.transaction.groupBy({
            by: ['employeeId'],
            where: {
                locationId,
                status: 'COMPLETED',
                createdAt: { gte: since }
            },
            _count: { id: true },
            _sum: { total: true }
        })

        // Get employee names
        const empIds = salesData.map(s => s.employeeId).filter(Boolean) as string[]
        const employees = await prisma.user.findMany({
            where: { id: { in: empIds } },
            select: { id: true, name: true }
        })

        const empMap = new Map(employees.map(e => [e.id, e.name || 'Unknown']))

        const rankings = salesData
            .filter(s => s.employeeId)
            .map((s, idx) => ({
                rank: idx + 1,
                employeeId: s.employeeId!,
                name: empMap.get(s.employeeId!) || 'Unknown',
                transactionCount: s._count.id,
                totalSales: Math.round(Number(s._sum.total || 0) * 100) / 100,
                avgTicket: s._count.id > 0
                    ? Math.round((Number(s._sum.total || 0) / s._count.id) * 100) / 100
                    : 0
            }))
            .sort((a, b) => b.totalSales - a.totalSales)
            .map((r, idx) => ({ ...r, rank: idx + 1 }))

        return ApiResponse.success({ rankings, periodDays: days })
    } catch (error) {
        console.error('[EMPLOYEE_RANKING_GET]', error)
        return ApiResponse.error('Failed to generate employee rankings')
    }
}
