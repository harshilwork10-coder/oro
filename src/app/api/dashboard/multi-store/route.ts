import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/dashboard/multi-store
 *
 * Multi-store **owner operating system** data — powers both the
 * Multi-location Franchisee Owner and Single-location Franchisee Owner
 * dashboards.
 *
 * Returns per-location:
 *   today, yesterday, mtd, avgTicket, staff, lowStock,
 *   health (0–100), topIssue, status, growth, recommendedAction
 *
 * Returns summary-level:
 *   totalLocations, totalSales, totalTransactions, totalStaff,
 *   healthBreakdown, attentionItems[], lastUpdatedAt, dataTruth
 *
 * Business rules:
 *   • "yesterday" = previous fully-elapsed calendar day in America/Chicago
 *   • Growth = (today – yesterday) / yesterday
 *   • Health composite: revenue weight 40, staff 20, inventory 20, activity 20
 */
export async function GET(req: NextRequest) {
    const queriedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── Location scope ──────────────────────────────────────────────
        let locationFilter: any = {}
        if (user.role === 'PROVIDER') {
            locationFilter = {}
        } else if (user.franchiseId) {
            locationFilter = { franchiseId: user.franchiseId }
        } else {
            return NextResponse.json({
                locations: [],
                summary: emptySummary(),
                _meta: buildMeta(queriedAt),
            })
        }

        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: { id: true, name: true, address: true, franchiseId: true, provisioningStatus: true },
        })

        if (locations.length === 0) {
            return NextResponse.json({ locations: [], summary: emptySummary(), _meta: buildMeta(queriedAt) })
        }

        // ── Date ranges ─────────────────────────────────────────────────
        const TZ = 'America/Chicago'
        const nowLocal = new Date(queriedAt.toLocaleString('en-US', { timeZone: TZ }))

        const startOfToday = new Date(nowLocal); startOfToday.setHours(0, 0, 0, 0)
        const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
        const endOfYesterday = new Date(startOfToday); endOfYesterday.setMilliseconds(-1)
        const startOfMonth = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1)
        const thirtyDaysAgo = new Date(nowLocal); thirtyDaysAgo.setDate(nowLocal.getDate() - 30)

        // ── Per-location fetch ──────────────────────────────────────────
        const locationIds = locations.map(l => l.id)
        const franchiseIds = [...new Set(locations.map(l => l.franchiseId).filter(Boolean))] as string[]

        // Batch: appointments for today
        let allAppointments: any[] = []
        try {
            allAppointments = await prisma.appointment.findMany({
                where: {
                    locationId: { in: locationIds },
                    startTime: { gte: startOfToday },
                },
                select: { id: true, status: true, locationId: true, clientId: true },
            })
        } catch { /* table may not exist */ }

        // Batch: recent appointments for repeat/no-show (30d)
        let recentAppointments: any[] = []
        try {
            recentAppointments = await prisma.appointment.findMany({
                where: {
                    locationId: { in: locationIds },
                    startTime: { gte: thirtyDaysAgo },
                },
                select: { id: true, status: true, locationId: true, clientId: true },
            })
        } catch { /* table may not exist */ }

        // Batch: active exceptions
        let exceptions: any[] = []
        try {
            exceptions = await (prisma as any).storeException.findMany({
                where: { locationId: { in: locationIds }, resolvedAt: null },
                select: { id: true, type: true, severity: true, title: true, description: true, locationId: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 30,
            })
        } catch { /* table may not exist */ }

        const locationData = await Promise.all(
            locations.map(async (location) => {
                // Today's transactions
                const todayTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfToday },
                        status: 'COMPLETED',
                    },
                    select: { total: true, paymentMethod: true, clientId: true },
                })

                // Yesterday's transactions
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

                // Low stock
                const lowStockItems = location.franchiseId
                    ? await prisma.product.count({
                        where: { franchiseId: location.franchiseId, isActive: true, stock: { lte: 5 } },
                    })
                    : 0

                // Staff
                const employeeCount = await prisma.user.count({
                    where: { locationId: location.id },
                })
                let onClockCount = 0
                try {
                    onClockCount = await prisma.timeClock.count({
                        where: { locationId: location.id, clockOut: null },
                    })
                } catch { /* timeClock may not exist */ }

                // Calculate metrics
                const todaySales = todayTransactions.reduce((s, t) => s + Number(t.total), 0)
                const yesterdaySales = yesterdayTransactions.reduce((s, t) => s + Number(t.total), 0)
                const todayCash = todayTransactions.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.total), 0)
                const todayCard = todayTransactions.filter(t => t.paymentMethod === 'CARD').reduce((s, t) => s + Number(t.total), 0)
                const mtdSales = mtdTransactions.reduce((s, t) => s + Number(t.total), 0)
                const avgTicket = todayTransactions.length > 0 ? todaySales / todayTransactions.length : 0
                const growth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : 0

                // Per-location appointments
                const locApptsToday = allAppointments.filter(a => a.locationId === location.id)
                const locAppts30d = recentAppointments.filter(a => a.locationId === location.id)
                const todayApptCount = locApptsToday.length
                const noShows30d = locAppts30d.filter(a => a.status === 'NO_SHOW').length
                const noShowPct = locAppts30d.length > 0 ? (noShows30d / locAppts30d.length * 100) : 0

                // Repeat % (clients with 2+ visits in 30d)
                const clientVisits = new Map<string, number>()
                for (const a of locAppts30d.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT')) {
                    if (a.clientId) clientVisits.set(a.clientId, (clientVisits.get(a.clientId) || 0) + 1)
                }
                const uniqueClients = clientVisits.size
                const repeatClients = Array.from(clientVisits.values()).filter(v => v >= 2).length
                const repeatPct = uniqueClients > 0 ? (repeatClients / uniqueClients * 100) : 0

                // Per-location exceptions
                const locExceptions = exceptions.filter(e => e.locationId === location.id)

                // Health Score (0-100)
                const revenueScore = todaySales > 0 ? Math.min(40, (todaySales / Math.max(yesterdaySales, 100)) * 40) : 0
                const staffScore = employeeCount > 0 ? (onClockCount > 0 ? 20 : 10) : 0
                const inventoryScore = lowStockItems <= 3 ? 20 : lowStockItems <= 10 ? 12 : 5
                const activityScore = todayTransactions.length > 0 ? 20 : (todayApptCount > 0 ? 10 : 0)
                const health = Math.round(Math.min(100, revenueScore + staffScore + inventoryScore + activityScore))

                // Top Issue
                let topIssue = ''
                let recommendedAction = ''
                if (locExceptions.some(e => e.severity === 'CRITICAL')) {
                    topIssue = locExceptions.find(e => e.severity === 'CRITICAL')?.title || 'Critical exception'
                    recommendedAction = 'Resolve critical exception immediately'
                } else if (lowStockItems > 10) {
                    topIssue = `${lowStockItems} items low/out of stock`
                    recommendedAction = 'Review and reorder inventory'
                } else if (noShowPct > 15) {
                    topIssue = `${noShowPct.toFixed(0)}% no-show rate (30d)`
                    recommendedAction = 'Enable appointment confirmations'
                } else if (onClockCount === 0 && employeeCount > 0) {
                    topIssue = 'No staff clocked in'
                    recommendedAction = 'Check staff schedule'
                } else if (todayTransactions.length === 0 && todayApptCount > 0) {
                    topIssue = 'Appointments but no sales yet'
                    recommendedAction = 'Check front-desk operation'
                }

                // Status
                const status: string =
                    locExceptions.some(e => e.severity === 'CRITICAL') ? 'critical'
                        : (lowStockItems > 10 || noShowPct > 20) ? 'warning'
                            : todayTransactions.length > 0 ? 'active'
                                : employeeCount > 0 ? 'idle' : 'offline'

                return {
                    location: { id: location.id, name: location.name, address: location.address },
                    today: { sales: todaySales, transactions: todayTransactions.length, cash: todayCash, card: todayCard, avgTicket, appointments: todayApptCount },
                    yesterday: { sales: yesterdaySales, transactions: yesterdayTransactions.length },
                    mtd: { sales: mtdSales, transactions: mtdTransactions.length },
                    inventory: { lowStock: lowStockItems },
                    staff: { total: employeeCount, onClock: onClockCount, count: employeeCount },
                    appointments: { today: todayApptCount, noShowPct: round2(noShowPct) },
                    retention: { repeatPct: round2(repeatPct), uniqueClients },
                    health,
                    topIssue,
                    recommendedAction,
                    status,
                    growth: round2(growth),
                    exceptions: locExceptions.length,
                }
            }),
        )

        // ── Attention Items (auto-generated from data) ──────────────────
        const attentionItems: any[] = []
        for (const ld of locationData) {
            if (ld.health < 50) {
                attentionItems.push({
                    type: 'health', severity: 'critical', title: `${ld.location.name}: Health score ${ld.health}`,
                    description: ld.topIssue || 'Multiple issues detected', location: ld.location.name,
                    category: 'health', recommendedAction: ld.recommendedAction || 'Review store operations',
                })
            }
            if (ld.inventory.lowStock > 10) {
                attentionItems.push({
                    type: 'inventory', severity: 'warning', title: `${ld.location.name}: ${ld.inventory.lowStock} low-stock items`,
                    description: 'Multiple products below reorder point', location: ld.location.name,
                    category: 'inventory', recommendedAction: 'Reorder critical items',
                })
            }
            if (ld.appointments.noShowPct > 15) {
                attentionItems.push({
                    type: 'no-show', severity: 'warning', title: `${ld.location.name}: ${ld.appointments.noShowPct}% no-show rate`,
                    description: 'High no-show rate in last 30 days', location: ld.location.name,
                    category: 'operations', recommendedAction: 'Enable appointment reminders',
                })
            }
        }
        // Sort: critical first
        attentionItems.sort((a, b) => {
            const sev = { critical: 0, warning: 1, info: 2 }
            return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2)
        })

        // ── Health breakdown ────────────────────────────────────────────
        const healthBreakdown = {
            green: locationData.filter(l => l.health >= 80).length,
            yellow: locationData.filter(l => l.health >= 50 && l.health < 80).length,
            red: locationData.filter(l => l.health < 50).length,
        }

        // ── Exceptions list for UI ──────────────────────────────────────
        const exceptionItems = exceptions.slice(0, 15).map(e => ({
            id: e.id,
            type: e.type || 'STORE_EXCEPTION',
            severity: (e.severity || 'WARNING').toLowerCase() as 'critical' | 'warning' | 'info',
            title: e.title || 'Exception',
            description: e.description || '',
            location: locations.find(l => l.id === e.locationId)?.name || '',
        }))

        // ── Summary ─────────────────────────────────────────────────────
        const summary = {
            totalLocations: locations.length,
            todaySales: locationData.reduce((s, l) => s + l.today.sales, 0),
            todayTransactions: locationData.reduce((s, l) => s + l.today.transactions, 0),
            yesterdaySales: locationData.reduce((s, l) => s + l.yesterday.sales, 0),
            mtdSales: locationData.reduce((s, l) => s + l.mtd.sales, 0),
            totalStaff: locationData.reduce((s, l) => s + l.staff.total, 0),
            totalOnClock: locationData.reduce((s, l) => s + l.staff.onClock, 0),
            totalAppointments: locationData.reduce((s, l) => s + l.today.appointments, 0),
            lowStockTotal: locationData.reduce((s, l) => s + l.inventory.lowStock, 0),
            topLocation: locationData.length > 0
                ? locationData.reduce((prev, curr) => prev.today.sales > curr.today.sales ? prev : curr).location.name
                : null,
            avgHealth: locationData.length > 0
                ? Math.round(locationData.reduce((s, l) => s + l.health, 0) / locationData.length)
                : 0,
            healthBreakdown,
        }

        return NextResponse.json({
            locations: locationData,
            summary,
            attentionItems,
            exceptions: exceptionItems,
            _meta: buildMeta(queriedAt),
        })
    } catch (error) {
        console.error('[MULTI_STORE_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100 }

function emptySummary() {
    return {
        totalLocations: 0, todaySales: 0, todayTransactions: 0, yesterdaySales: 0, mtdSales: 0,
        totalStaff: 0, totalOnClock: 0, totalAppointments: 0, lowStockTotal: 0, topLocation: null,
        avgHealth: 0, healthBreakdown: { green: 0, yellow: 0, red: 0 },
    }
}

function buildMeta(queriedAt: Date) {
    return {
        queriedAt: queriedAt.toISOString(),
        lastUpdatedAt: queriedAt.toISOString(),
        freshness: 'live',
        dataTruth: 'primary_db',
        source: 'primary_db',
        businessDate: new Date(queriedAt.toLocaleString('en-US', { timeZone: 'America/Chicago' })).toISOString().split('T')[0],
        businessDayCutoff: 'midnight America/Chicago',
    }
}
