/**
 * Age-Restricted Sales Log API
 *
 * GET — Log of all age-verified transactions (alcohol, tobacco, lottery)
 *        Uses IDScanLog for verification events
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
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const type = searchParams.get('type') // SCANNED, OVERRIDE
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
        const since = new Date(); since.setDate(since.getDate() - days)

        const where: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            createdAt: { gte: since }
        }
        if (type) where.type = type

        const [logs, total] = await Promise.all([
            prisma.iDScanLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.iDScanLog.count({ where })
        ])

        const items = logs.map(log => ({
            id: log.id,
            date: log.createdAt,
            type: log.type,
            employeeId: log.employeeId,
            employeeName: log.employeeName || 'Unknown',
            transactionId: log.transactionId,
            customerDOB: log.customerDOB,
            items: log.items ? JSON.parse(log.items) : [],
            locationId: log.locationId
        }))

        // Summary
        const allLogs = await prisma.iDScanLog.groupBy({
            by: ['type'],
            where: { franchiseId: user.franchiseId, createdAt: { gte: since } },
            _count: { id: true }
        })

        const summary = {
            total,
            scanned: allLogs.find(l => l.type === 'SCANNED')?._count.id || 0,
            overrides: allLogs.find(l => l.type === 'OVERRIDE')?._count.id || 0,
            overrideRate: total > 0
                ? Math.round(((allLogs.find(l => l.type === 'OVERRIDE')?._count.id || 0) / total) * 1000) / 10
                : 0
        }

        return ApiResponse.success({
            logs: items,
            summary,
            pagination: { page, pages: Math.ceil(total / limit), total },
            periodDays: days
        })
    } catch (error) {
        console.error('[AGE_RESTRICTED_GET]', error)
        return ApiResponse.error('Failed to generate age-restricted sales log', 500)
    }
}
