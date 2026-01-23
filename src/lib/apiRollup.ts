// Daily API Usage Rollup Job
// Aggregates raw ApiLog entries into ApiUsageDaily for efficient dashboards
// Run this daily via cron: 0 2 * * * (2 AM)

import { prisma } from '@/lib/prisma'

/**
 * Rollup yesterday's API logs into daily aggregates
 * Also cleans up old raw logs (retention: 14 days)
 */
export async function runDailyApiRollup(): Promise<{
    rolledUp: number
    deleted: number
}> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const endOfYesterday = new Date(yesterday)
    endOfYesterday.setHours(23, 59, 59, 999)

    console.log(`[ROLLUP] Processing logs from ${yesterday.toISOString()} to ${endOfYesterday.toISOString()}`)

    try {
        // Step 1: Get aggregated stats per (date, locationId, route)
        const stats = await prisma.$queryRaw<Array<{
            locationId: string | null
            route: string
            totalCalls: bigint
            successCalls: bigint
            clientErrors: bigint
            serverErrors: bigint
            avgLatencyMs: number
            p95LatencyMs: number
            totalBytes: bigint
        }>>`
            SELECT 
                "locationId",
                route,
                COUNT(*) as "totalCalls",
                SUM(CASE WHEN "statusClass" = '2xx' THEN 1 ELSE 0 END) as "successCalls",
                SUM(CASE WHEN "statusClass" = '4xx' THEN 1 ELSE 0 END) as "clientErrors",
                SUM(CASE WHEN "statusClass" = '5xx' THEN 1 ELSE 0 END) as "serverErrors",
                AVG("latencyMs")::int as "avgLatencyMs",
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "latencyMs")::int as "p95LatencyMs",
                COALESCE(SUM("responseBytes"), 0) as "totalBytes"
            FROM "ApiLog"
            WHERE "createdAt" >= ${yesterday} AND "createdAt" <= ${endOfYesterday}
            GROUP BY "locationId", route
        `

        console.log(`[ROLLUP] Found ${stats.length} unique (location, route) combinations`)

        // Step 2: Upsert into ApiUsageDaily
        let rolledUp = 0
        for (const stat of stats) {
            await prisma.apiUsageDaily.upsert({
                where: {
                    date_locationId_route: {
                        date: yesterday,
                        locationId: stat.locationId,
                        route: stat.route
                    }
                },
                create: {
                    date: yesterday,
                    locationId: stat.locationId,
                    route: stat.route,
                    totalCalls: Number(stat.totalCalls),
                    successCalls: Number(stat.successCalls),
                    clientErrors: Number(stat.clientErrors),
                    serverErrors: Number(stat.serverErrors),
                    avgLatencyMs: stat.avgLatencyMs,
                    p95LatencyMs: stat.p95LatencyMs,
                    totalBytes: stat.totalBytes
                },
                update: {
                    totalCalls: Number(stat.totalCalls),
                    successCalls: Number(stat.successCalls),
                    clientErrors: Number(stat.clientErrors),
                    serverErrors: Number(stat.serverErrors),
                    avgLatencyMs: stat.avgLatencyMs,
                    p95LatencyMs: stat.p95LatencyMs,
                    totalBytes: stat.totalBytes
                }
            })
            rolledUp++
        }

        // Step 3: Clean up old raw logs (keep 14 days)
        const retentionDate = new Date()
        retentionDate.setDate(retentionDate.getDate() - 14)

        const deleteResult = await prisma.apiLog.deleteMany({
            where: {
                createdAt: { lt: retentionDate }
            }
        })

        console.log(`[ROLLUP] Rolled up ${rolledUp} entries, deleted ${deleteResult.count} old logs`)

        return { rolledUp, deleted: deleteResult.count }

    } catch (error) {
        console.error('[ROLLUP] Failed:', error)
        throw error
    }
}

/**
 * Get API usage summary from rollups (not raw logs)
 * Use this for dashboards
 */
export async function getApiUsageSummary(params: {
    locationId?: string
    days?: number
    limit?: number
}) {
    const { locationId, days = 30, limit = 50 } = params

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where: any = {
        date: { gte: startDate }
    }
    if (locationId) {
        where.locationId = locationId
    }

    // Get daily totals
    const dailyTotals = await prisma.apiUsageDaily.groupBy({
        by: ['date'],
        where,
        _sum: {
            totalCalls: true,
            successCalls: true,
            clientErrors: true,
            serverErrors: true
        },
        orderBy: { date: 'desc' },
        take: days
    })

    // Get top routes
    const topRoutes = await prisma.apiUsageDaily.groupBy({
        by: ['route'],
        where,
        _sum: {
            totalCalls: true,
            serverErrors: true
        },
        _avg: {
            avgLatencyMs: true
        },
        orderBy: { _sum: { totalCalls: 'desc' } },
        take: limit
    })

    return { dailyTotals, topRoutes }
}
