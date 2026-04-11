/**
 * Employee Sales Ranking (Leaderboard) API
 *
 * GET — Rank employees by total sales revenue, transaction count, and avg ticket
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Group sales by employee
        const salesData = await prisma.transaction.groupBy({
            by: ['employeeId'],
            where: {
                franchiseId: user.franchiseId,
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
            select: { id: true, firstName: true, lastName: true }
        })

        const empMap = new Map(employees.map(e => [e.id, `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown']))

        const rankings = salesData
            .filter(s => s.employeeId)
            .map(s => ({
                rank: 0,
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

        return NextResponse.json({ rankings, periodDays: days })
    } catch (error) {
        console.error('[EMPLOYEE_RANKING_GET]', error)
        return NextResponse.json({ error: 'Failed to generate employee rankings' }, { status: 500 })
    }
}
