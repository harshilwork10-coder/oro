import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/dashboard/multi-store
 *
 * Multi-store performance comparison dashboard data.
 *
 * Business rules for "yesterday":
 *   • "Yesterday" = the most-recent fully-elapsed calendar day in the
 *     franchise's local timezone.  Because we don't yet store a per-location
 *     IANA timezone, we default to America/Chicago (CST/CDT, UTC-6/-5).
 *   • All date windows are computed server-side so API consumers don't need
 *     to know the rule.
 *
 * Data-truth metadata:
 *   Every response includes a `_meta` envelope with `queriedAt`, `freshness`,
 *   and `businessDayCutoff` so the UI can render a DataTruthLabel.
 */
export async function GET(req: NextRequest) {
    const queriedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ── Location scope ──────────────────────────────────────────────
        let locationFilter: any = {}

        if (user.role === 'PROVIDER') {
            // Provider sees ALL locations across all franchises
            locationFilter = {}
        } else if (user.franchiseId) {
            locationFilter = { franchiseId: user.franchiseId }
        } else {
            return NextResponse.json({
                locations: [],
                summary: {
                    totalLocations: 0,
                    todaySales: 0,
                    todayTransactions: 0,
                    yesterdaySales: 0,
                    mtdSales: 0,
                    lowStockTotal: 0,
                    topLocation: null,
                },
                _meta: buildMeta(queriedAt),
            })
        }

        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: {
                id: true,
                name: true,
                address: true,
                franchiseId: true,
            },
        })

        if (locations.length === 0) {
            return NextResponse.json({ locations: [], summary: null, _meta: buildMeta(queriedAt) })
        }

        // ── Date ranges ─────────────────────────────────────────────────
        // Default TZ: America/Chicago (franchise-level TZ not yet modeled)
        const TZ = 'America/Chicago'
        const nowLocal = new Date(queriedAt.toLocaleString('en-US', { timeZone: TZ }))

        // Today: midnight → now (in TZ)
        const startOfToday = new Date(nowLocal)
        startOfToday.setHours(0, 0, 0, 0)

        // Yesterday: previous full calendar day
        const startOfYesterday = new Date(startOfToday)
        startOfYesterday.setDate(startOfYesterday.getDate() - 1)
        const endOfYesterday = new Date(startOfToday)
        endOfYesterday.setMilliseconds(-1)

        // MTD
        const startOfMonth = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1)

        // ── Per-location fetch ──────────────────────────────────────────
        const locationData = await Promise.all(
            locations.map(async (location) => {
                // Today's transactions
                const todayTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfToday },
                        status: 'COMPLETED',
                    },
                    select: { total: true, paymentMethod: true },
                })

                // Yesterday's transactions (THE BUG FIX — previously never queried)
                const yesterdayTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfYesterday, lte: endOfYesterday },
                        status: 'COMPLETED',
                    },
                    select: { total: true },
                })

                // MTD transactions
                const mtdTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfMonth },
                        status: 'COMPLETED',
                    },
                    select: { total: true },
                })

                // Low stock items
                const lowStockItems = location.franchiseId
                    ? await prisma.product.count({
                          where: {
                              franchiseId: location.franchiseId,
                              isActive: true,
                              stock: { lte: 5 },
                          },
                      })
                    : 0

                // Active employees at this location
                const employeeCount = await prisma.user.count({
                    where: { locationId: location.id },
                })

                // On-clock count (active time-clock entries)
                let onClockCount = 0
                try {
                    onClockCount = await prisma.timeClock.count({
                        where: {
                            locationId: location.id,
                            clockOut: null,
                        },
                    })
                } catch {
                    // timeClock table may not exist in every env
                }

                // Calculate metrics
                const todaySales = todayTransactions.reduce((s, t) => s + Number(t.total), 0)
                const yesterdaySales = yesterdayTransactions.reduce((s, t) => s + Number(t.total), 0)
                const todayCash = todayTransactions
                    .filter((t) => t.paymentMethod === 'CASH')
                    .reduce((s, t) => s + Number(t.total), 0)
                const todayCard = todayTransactions
                    .filter((t) => t.paymentMethod === 'CARD')
                    .reduce((s, t) => s + Number(t.total), 0)
                const mtdSales = mtdTransactions.reduce((s, t) => s + Number(t.total), 0)
                const avgTicket =
                    todayTransactions.length > 0 ? todaySales / todayTransactions.length : 0

                // Derive operational status
                const status: 'active' | 'warning' | 'idle' | 'offline' =
                    todayTransactions.length > 0
                        ? lowStockItems > 10
                            ? 'warning'
                            : 'active'
                        : employeeCount > 0
                          ? 'idle'
                          : 'offline'

                return {
                    location: {
                        id: location.id,
                        name: location.name,
                        address: location.address,
                    },
                    today: {
                        sales: todaySales,
                        transactions: todayTransactions.length,
                        cash: todayCash,
                        card: todayCard,
                        avgTicket,
                    },
                    yesterday: {
                        sales: yesterdaySales,
                        transactions: yesterdayTransactions.length,
                    },
                    mtd: {
                        sales: mtdSales,
                        transactions: mtdTransactions.length,
                    },
                    inventory: {
                        lowStock: lowStockItems,
                    },
                    staff: {
                        total: employeeCount,
                        onClock: onClockCount,
                    },
                    status,
                }
            }),
        )

        // ── Summary ─────────────────────────────────────────────────────
        const summary = {
            totalLocations: locations.length,
            todaySales: locationData.reduce((s, l) => s + l.today.sales, 0),
            todayTransactions: locationData.reduce((s, l) => s + l.today.transactions, 0),
            yesterdaySales: locationData.reduce((s, l) => s + l.yesterday.sales, 0),
            mtdSales: locationData.reduce((s, l) => s + l.mtd.sales, 0),
            lowStockTotal: locationData.reduce((s, l) => s + l.inventory.lowStock, 0),
            topLocation:
                locationData.length > 0
                    ? locationData.reduce((prev, curr) =>
                          prev.today.sales > curr.today.sales ? prev : curr,
                      ).location.name
                    : null,
        }

        return NextResponse.json({
            locations: locationData,
            summary,
            _meta: buildMeta(queriedAt),
        })
    } catch (error) {
        console.error('[MULTI_STORE_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildMeta(queriedAt: Date) {
    return {
        queriedAt: queriedAt.toISOString(),
        freshness: 'live',
        source: 'primary_db',
        businessDayCutoff: 'midnight America/Chicago',
        note: 'yesterdaySales = previous full calendar day in franchise TZ',
    }
}
