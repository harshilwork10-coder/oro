import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue'

/**
 * GET /api/dashboard/independent-owner
 *
 * Independent Salon Owner operating dashboard — CEO-grade intelligence.
 * Answers: performance, utilization, retention, margins, blockers, opportunities.
 *
 * Enriched with:
 *   - Per-location health scores, topIssue, recommendedAction
 *   - Stylist productivity per-location (not just global)
 *   - Repeat %, rebooking rate, no-show %
 *   - Retail attach rate, margin data
 *   - Auto-generated attentionItems[] and opportunities[]
 *   - lastUpdatedAt, dataTruth, businessDate
 */
export async function GET(req: NextRequest) {
    const fetchedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── Resolve franchise(s) for this owner ─────────────────────────
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, franchiseId: true },
        })
        if (!dbUser?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: dbUser.id },
            select: { id: true, name: true },
        })

        const franchiseIds: string[] = []
        if (franchisor) {
            const franchises = await prisma.franchise.findMany({
                where: { franchisorId: franchisor.id },
                select: { id: true },
            })
            franchiseIds.push(...franchises.map(f => f.id))
        }
        if (franchiseIds.length === 0) {
            franchiseIds.push(dbUser.franchiseId)
        }

        // ── Date ranges ─────────────────────────────────────────────────
        const now = new Date()
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)
        const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60)
        const businessDate = now.toISOString().split('T')[0]

        // ── Locations ──────────────────────────────────────────────────
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: {
                id: true, name: true, provisioningStatus: true, address: true,
                _count: { select: { resources: true } },
            },
        })
        const locationIds = locations.map(l => l.id)

        // ── Resources (chairs) ─────────────────────────────────────────
        const chairs = await prisma.resource.findMany({
            where: { locationId: { in: locationIds }, type: 'CHAIR', isActive: true },
            select: { id: true, locationId: true },
        })
        const totalChairs = chairs.length

        // ── Employees (stylists) ────────────────────────────────────────
        const employees = await prisma.user.findMany({
            where: { franchiseId: { in: franchiseIds }, role: { in: ['EMPLOYEE', 'MANAGER'] } },
            select: { id: true, name: true, franchiseId: true, locationId: true },
        })

        // ── Appointments (30 days) ──────────────────────────────────────
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: { gte: thirtyDaysAgo },
            },
            select: {
                id: true, status: true, clientId: true, serviceId: true,
                employeeId: true, resourceId: true, startTime: true, endTime: true,
                locationId: true,
            },
        })

        const completedAppts = appointments.filter(
            a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT',
        )
        const noShows = appointments.filter(a => a.status === 'NO_SHOW')
        const totalAppts = appointments.length

        // ── Transactions (current 30d + prior 30d) ──────────────────────
        const allTx = await prisma.transaction.findMany({
            where: {
                franchiseId: { in: franchiseIds },
                createdAt: { gte: sixtyDaysAgo },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
            },
            select: {
                id: true, total: true, totalCash: true, chargedMode: true,
                subtotal: true, tax: true, discount: true,
                createdAt: true, clientId: true, employeeId: true, locationId: true,
            },
        })

        const currentTx = allTx.filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
        const priorTx = allTx.filter(
            t => new Date(t.createdAt) >= sixtyDaysAgo && new Date(t.createdAt) < thirtyDaysAgo,
        )

        const currentRevenue = sumRevenue(currentTx)
        const priorRevenue = sumRevenue(priorTx)
        const revDelta = priorRevenue > 0 ? ((currentRevenue - priorRevenue) / priorRevenue * 100) : 0

        // ── Line items for service mix + margins ────────────────────────
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                transaction: {
                    franchiseId: { in: franchiseIds },
                    createdAt: { gte: thirtyDaysAgo },
                    status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
                },
            },
            select: {
                type: true, serviceId: true, productId: true, staffId: true,
                total: true, quantity: true, price: true,
                commissionAmount: true, ownerAmount: true,
                cashLineTotal: true, cardLineTotal: true, lineChargedMode: true,
                service: { select: { name: true, categoryId: true } },
                product: { select: { name: true, cost: true, cashPrice: true, price: true } },
                transaction: { select: { locationId: true } },
            },
        })

        const serviceLines = lineItems.filter(li => li.type === 'SERVICE')
        const productLines = lineItems.filter(li => li.type === 'PRODUCT')

        const serviceRevenue = serviceLines.reduce(
            (sum, li) => sum + Number(li.cashLineTotal ?? li.total ?? 0), 0,
        )
        const productRevenue = productLines.reduce(
            (sum, li) => sum + Number(li.cashLineTotal ?? li.total ?? 0), 0,
        )
        const totalLineRevenue = serviceRevenue + productRevenue

        // Product margin
        let productCost = 0
        let productMarginRevenue = 0
        for (const li of productLines) {
            const cost = li.product?.cost ? Number(li.product.cost) : 0
            const rev = Number(li.cashLineTotal ?? li.total ?? 0)
            productCost += cost * (li.quantity || 1)
            productMarginRevenue += rev
        }
        const productMarginPct = productMarginRevenue > 0
            ? ((productMarginRevenue - productCost) / productMarginRevenue * 100) : 0

        // ── Stylist productivity (global) ────────────────────────────────
        const stylistRevMap = new Map<string, { revenue: number; txns: number; name: string; locationId?: string }>()
        for (const li of serviceLines) {
            const sid = li.staffId || 'unknown'
            if (!stylistRevMap.has(sid)) stylistRevMap.set(sid, { revenue: 0, txns: 0, name: '' })
            const entry = stylistRevMap.get(sid)!
            entry.revenue += Number(li.cashLineTotal ?? li.total ?? 0)
            entry.txns++
        }
        for (const emp of employees) {
            if (stylistRevMap.has(emp.id)) {
                const entry = stylistRevMap.get(emp.id)!
                entry.name = emp.name || `Staff ${emp.id.slice(-4)}`
                entry.locationId = emp.locationId || undefined
            }
        }

        const stylistProductivity = Array.from(stylistRevMap.entries())
            .map(([id, data]) => ({
                id, name: data.name || `Staff ${id.slice(-4)}`,
                revenue: data.revenue, services: data.txns,
                avgTicket: data.txns > 0 ? data.revenue / data.txns : 0,
                locationId: data.locationId,
            }))
            .sort((a, b) => b.revenue - a.revenue)

        // ── Repeat customers / Retention ────────────────────────────────
        const clientVisits = new Map<string, number>()
        for (const appt of completedAppts) {
            if (!appt.clientId) continue
            clientVisits.set(appt.clientId, (clientVisits.get(appt.clientId) || 0) + 1)
        }
        const totalUniqueClients = clientVisits.size
        const repeatClients = Array.from(clientVisits.values()).filter(v => v >= 2).length
        const repeatPct = totalUniqueClients > 0 ? (repeatClients / totalUniqueClients * 100) : 0

        // Rebooking
        const futureAppts = await prisma.appointment.count({
            where: {
                locationId: { in: locationIds },
                startTime: { gt: now },
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
            },
        })
        const rebookingRate = completedAppts.length > 0
            ? Math.min(100, (futureAppts / completedAppts.length * 100)) : 0

        // ── Chair utilization ───────────────────────────────────────────
        const operatingDays = 30
        const hoursPerDay = 10
        const totalChairHours = totalChairs * operatingDays * hoursPerDay
        const bookedHours = completedAppts.reduce((sum, a) => {
            const dur = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60)
            return sum + Math.min(dur, 12)
        }, 0)
        const chairUtilization = totalChairHours > 0 ? (bookedHours / totalChairHours * 100) : 0

        // ── Low stock ───────────────────────────────────────────────────
        const lowStockProducts = await prisma.product.findMany({
            where: {
                franchiseId: { in: franchiseIds },
                isActive: true,
                stock: { lte: 5 },
                reorderPoint: { not: null },
            },
            select: { id: true, name: true, stock: true, reorderPoint: true, cashPrice: true, price: true },
            take: 20,
            orderBy: { stock: 'asc' },
        })

        // ── Service mix (top services by revenue) ───────────────────────
        const serviceMix = new Map<string, { name: string; revenue: number; count: number }>()
        for (const li of serviceLines) {
            const sName = li.service?.name || 'Unknown'
            if (!serviceMix.has(sName)) serviceMix.set(sName, { name: sName, revenue: 0, count: 0 })
            const entry = serviceMix.get(sName)!
            entry.revenue += Number(li.cashLineTotal ?? li.total ?? 0)
            entry.count++
        }
        const topServices = Array.from(serviceMix.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8)

        // ── Active exceptions ───────────────────────────────────────────
        let activeExceptions = 0
        let exceptionsList: any[] = []
        try {
            exceptionsList = await (prisma as any).storeException.findMany({
                where: { locationId: { in: locationIds }, resolvedAt: null },
                select: { id: true, type: true, severity: true, title: true, description: true, locationId: true },
                orderBy: { createdAt: 'desc' },
                take: 15,
            })
            activeExceptions = exceptionsList.length
        } catch { /* table may not exist */ }

        // ── Per-location breakdown (enriched) ───────────────────────────
        const locationBreakdown = locations.map(loc => {
            const locAppts = completedAppts.filter(a => a.locationId === loc.id)
            const locTx = currentTx.filter(t => t.locationId === loc.id)
            const locRevenue = sumRevenue(locTx)
            const locChairs = chairs.filter(c => c.locationId === loc.id).length
            const locBookedHrs = locAppts.reduce((sum, a) => {
                const dur = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60)
                return sum + Math.min(dur, 12)
            }, 0)
            const locChairUtil = locChairs > 0
                ? (locBookedHrs / (locChairs * operatingDays * hoursPerDay) * 100) : 0

            // Per-location retention
            const locClientVisits = new Map<string, number>()
            for (const a of locAppts) {
                if (a.clientId) locClientVisits.set(a.clientId, (locClientVisits.get(a.clientId) || 0) + 1)
            }
            const locRepeatPct = locClientVisits.size > 0
                ? (Array.from(locClientVisits.values()).filter(v => v >= 2).length / locClientVisits.size * 100) : 0

            const locNoShows = appointments.filter(a => a.locationId === loc.id && a.status === 'NO_SHOW')
            const locTotalAppts = appointments.filter(a => a.locationId === loc.id).length
            const locNoShowPct = locTotalAppts > 0 ? (locNoShows.length / locTotalAppts * 100) : 0

            // Per-location service/product split
            const locServiceLines = serviceLines.filter(li => (li.transaction as any)?.locationId === loc.id)
            const locProductLines = productLines.filter(li => (li.transaction as any)?.locationId === loc.id)
            const locServiceRev = locServiceLines.reduce((s, li) => s + Number(li.cashLineTotal ?? li.total ?? 0), 0)
            const locProductRev = locProductLines.reduce((s, li) => s + Number(li.cashLineTotal ?? li.total ?? 0), 0)
            const locTotalRev = locServiceRev + locProductRev
            const retailAttachRate = locTotalRev > 0 ? (locProductRev / locTotalRev * 100) : 0

            // Per-location product margin
            let locProductCost = 0, locProductMarginRev = 0
            for (const li of locProductLines) {
                locProductCost += (li.product?.cost ? Number(li.product.cost) : 0) * (li.quantity || 1)
                locProductMarginRev += Number(li.cashLineTotal ?? li.total ?? 0)
            }
            const locProductMarginPct = locProductMarginRev > 0 ? ((locProductMarginRev - locProductCost) / locProductMarginRev * 100) : 0

            // Per-location stylist productivity
            const locStylists = stylistProductivity.filter(s => s.locationId === loc.id)

            // Per-location health score
            const revScore = locRevenue > 0 ? Math.min(25, 25) : 0
            const utilScore = locChairUtil >= 50 ? 25 : Math.round(locChairUtil * 25 / 50)
            const retainScore = locRepeatPct >= 30 ? 25 : Math.round(locRepeatPct * 25 / 30)
            const opScore = locNoShowPct < 10 ? 25 : locNoShowPct < 20 ? 15 : 5
            const locHealth = Math.min(100, revScore + utilScore + retainScore + opScore)

            // Top Issue
            let locTopIssue = ''
            let locRecommendedAction = ''
            if (locChairUtil < 30 && locChairs > 0) {
                locTopIssue = `Chair utilization ${locChairUtil.toFixed(0)}% (low)`
                locRecommendedAction = 'Increase booking capacity or marketing'
            } else if (locNoShowPct > 15) {
                locTopIssue = `${locNoShowPct.toFixed(0)}% no-show rate`
                locRecommendedAction = 'Enable appointment reminders'
            } else if (locRepeatPct < 20 && locClientVisits.size > 5) {
                locTopIssue = `Low repeat rate (${locRepeatPct.toFixed(0)}%)`
                locRecommendedAction = 'Activate rebooking incentives'
            }

            return {
                id: loc.id,
                name: loc.name,
                address: loc.address || '',
                revenue: locRevenue,
                appointments: locAppts.length,
                chairs: locChairs,
                chairUtilization: round2(locChairUtil),
                transactions: locTx.length,
                repeatPct: round2(locRepeatPct),
                noShowPct: round2(locNoShowPct),
                retailAttachRate: round2(retailAttachRate),
                serviceRevenue: locServiceRev,
                productRevenue: locProductRev,
                productMarginPct: round2(locProductMarginPct),
                health: locHealth,
                topIssue: locTopIssue,
                recommendedAction: locRecommendedAction,
                stylists: locStylists.slice(0, 5),
                uniqueClients: locClientVisits.size,
                staffCount: employees.filter(e => e.locationId === loc.id).length,
            }
        })

        // ── Attention Items (auto-generated) ────────────────────────────
        const attentionItems: any[] = []
        for (const loc of locationBreakdown) {
            if (loc.health < 50) {
                attentionItems.push({
                    type: 'health', severity: 'critical', title: `${loc.name}: Health ${loc.health}`,
                    description: loc.topIssue || 'Multiple issues', location: loc.name,
                    category: 'health', recommendedAction: loc.recommendedAction,
                })
            }
            if (loc.chairUtilization < 30 && loc.chairs > 0) {
                attentionItems.push({
                    type: 'utilization', severity: 'warning', title: `${loc.name}: ${loc.chairUtilization.toFixed(0)}% chair utilization`,
                    description: 'Chairs underutilized — potential revenue loss', location: loc.name,
                    category: 'utilization', recommendedAction: 'Increase booking or reduce chair count',
                })
            }
        }
        if (rebookingRate < 30 && completedAppts.length > 10) {
            attentionItems.push({
                type: 'retention', severity: 'warning', title: `Rebooking rate only ${rebookingRate.toFixed(0)}%`,
                description: 'Most clients are not rebooking before leaving', location: 'All',
                category: 'retention', recommendedAction: 'Train front desk on rebooking prompt',
            })
        }
        attentionItems.sort((a, b) => {
            const sev = { critical: 0, warning: 1, info: 2 }
            return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2)
        })

        // ── Opportunities ──────────────────────────────────────────────
        const opportunities: any[] = []
        if (productMarginPct > 40 && retailAttachRateGlobal() < 20) {
            opportunities.push({
                type: 'retail', title: 'Retail upsell potential',
                description: `Product margins are ${productMarginPct.toFixed(0)}% but attach rate is low. Train on retail recommendations.`,
            })
        }
        if (chairUtilization < 60 && totalChairs > 2) {
            opportunities.push({
                type: 'capacity', title: 'Chair capacity available',
                description: `Only ${chairUtilization.toFixed(0)}% utilized. Room for ${Math.round(totalChairs * 0.4)} more daily bookings.`,
            })
        }

        function retailAttachRateGlobal() {
            return totalLineRevenue > 0 ? (productRevenue / totalLineRevenue * 100) : 0
        }

        // ── Health breakdown ────────────────────────────────────────────
        const healthBreakdown = {
            green: locationBreakdown.filter(l => l.health >= 80).length,
            yellow: locationBreakdown.filter(l => l.health >= 50 && l.health < 80).length,
            red: locationBreakdown.filter(l => l.health < 50).length,
        }

        // ── Exception items for UI ──────────────────────────────────────
        const exceptionItems = exceptionsList.slice(0, 10).map(e => ({
            id: e.id,
            type: e.type || 'EXCEPTION',
            severity: (e.severity || 'WARNING').toLowerCase() as 'critical' | 'warning' | 'info',
            title: e.title || 'Exception',
            description: e.description || '',
            location: locations.find(l => l.id === e.locationId)?.name || '',
        }))

        return NextResponse.json({
            summary: {
                revenue: currentRevenue,
                priorRevenue,
                revDelta: round2(revDelta),
                totalTransactions: currentTx.length,
                avgTicket: currentTx.length > 0 ? currentRevenue / currentTx.length : 0,
                totalLocations: locations.length,
                totalStylists: employees.length,
                totalChairs,
                avgHealth: locationBreakdown.length > 0
                    ? Math.round(locationBreakdown.reduce((s, l) => s + l.health, 0) / locationBreakdown.length)
                    : 0,
                healthBreakdown,
            },
            utilization: {
                chairUtilization: round2(chairUtilization),
                bookedHours: round2(bookedHours),
                totalChairHours,
                completedAppointments: completedAppts.length,
                noShows: noShows.length,
                noShowRate: totalAppts > 0 ? round2(noShows.length / totalAppts * 100) : 0,
            },
            retention: {
                totalUniqueClients,
                repeatClients,
                repeatPct: round2(repeatPct),
                rebookingRate: round2(rebookingRate),
                futureBookings: futureAppts,
            },
            serviceMix: {
                serviceRevenue,
                productRevenue,
                servicePct: totalLineRevenue > 0 ? round2(serviceRevenue / totalLineRevenue * 100) : 0,
                productPct: totalLineRevenue > 0 ? round2(productRevenue / totalLineRevenue * 100) : 0,
                topServices,
            },
            margins: {
                productCost,
                productMarginRevenue,
                productMarginPct: round2(productMarginPct),
            },
            retail: {
                lowStockCount: lowStockProducts.length,
                lowStockItems: lowStockProducts.map(p => ({
                    id: p.id, name: p.name,
                    stock: p.stock, reorderPoint: p.reorderPoint,
                    price: Number(p.cashPrice ?? p.price ?? 0),
                })),
                productRevenue,
                retailAttachRate: retailAttachRateGlobal(),
            },
            stylistProductivity,
            locationBreakdown,
            attentionItems,
            opportunities,
            exceptions: exceptionItems,
            activeExceptions,
            _meta: {
                fetchedAt: fetchedAt.toISOString(),
                lastUpdatedAt: fetchedAt.toISOString(),
                freshness: 'live',
                dataTruth: 'primary_db',
                businessDate,
            },
        })
    } catch (error) {
        console.error('[INDEPENDENT_OWNER_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
    }
}

function round2(n: number) { return Math.round(n * 100) / 100 }
