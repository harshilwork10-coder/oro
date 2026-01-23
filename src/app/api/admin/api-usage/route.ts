// API Usage Dashboard - View API call statistics per location/endpoint
// PROVIDER role only - for cost monitoring and optimization

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
        // 1. Calls per day per location (last N days)
        const callsPerLocation = await prisma.$queryRaw<Array<{
            locationId: string | null
            date: string
            count: bigint
        }>>`
            SELECT 
                "locationId",
                DATE("createdAt") as date,
                COUNT(*) as count
            FROM "ApiLog"
            WHERE "createdAt" >= ${startDate}
            ${locationId ? prisma.$queryRaw`AND "locationId" = ${locationId}` : prisma.$queryRaw``}
            GROUP BY "locationId", DATE("createdAt")
            ORDER BY date DESC, count DESC
            LIMIT 100
        `

        // 2. Top 20 endpoints by volume
        const topEndpoints = await prisma.$queryRaw<Array<{
            route: string
            count: bigint
            avgLatency: number
            errorRate: number
        }>>`
            SELECT 
                route,
                COUNT(*) as count,
                AVG("latencyMs") as "avgLatency",
                (SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END)::float / COUNT(*) * 100) as "errorRate"
            FROM "ApiLog"
            WHERE "createdAt" >= ${startDate}
            ${locationId ? prisma.$queryRaw`AND "locationId" = ${locationId}` : prisma.$queryRaw``}
            GROUP BY route
            ORDER BY count DESC
            LIMIT 20
        `

        // 3. Summary stats
        const summary = await prisma.$queryRaw<Array<{
            totalCalls: bigint
            avgLatency: number
            errorCount: bigint
            uniqueLocations: bigint
        }>>`
            SELECT 
                COUNT(*) as "totalCalls",
                AVG("latencyMs") as "avgLatency",
                SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as "errorCount",
                COUNT(DISTINCT "locationId") as "uniqueLocations"
            FROM "ApiLog"
            WHERE "createdAt" >= ${startDate}
        `

        // 4. High-volume locations (potential spam)
        const highVolumeLocations = await prisma.$queryRaw<Array<{
            locationId: string
            callsPerDay: number
        }>>`
            SELECT 
                "locationId",
                (COUNT(*)::float / ${days}) as "callsPerDay"
            FROM "ApiLog"
            WHERE "createdAt" >= ${startDate}
            AND "locationId" IS NOT NULL
            GROUP BY "locationId"
            HAVING COUNT(*) / ${days} > 1000
            ORDER BY "callsPerDay" DESC
            LIMIT 10
        `

        // Convert BigInt to number for JSON serialization
        const formatResult = (obj: Record<string, any>) => {
            const result: Record<string, any> = {}
            for (const [key, value] of Object.entries(obj)) {
                result[key] = typeof value === 'bigint' ? Number(value) : value
            }
            return result
        }

        return NextResponse.json({
            success: true,
            period: { days, startDate: startDate.toISOString() },
            summary: summary[0] ? formatResult(summary[0]) : null,
            callsPerLocation: callsPerLocation.map(formatResult),
            topEndpoints: topEndpoints.map(formatResult),
            highVolumeLocations: highVolumeLocations.map(formatResult),
            alerts: highVolumeLocations.length > 0
                ? `${highVolumeLocations.length} location(s) exceeding 1000 calls/day`
                : null
        })

    } catch (error) {
        console.error('[API_USAGE] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch API usage stats' },
            { status: 500 }
        )
    }
}
