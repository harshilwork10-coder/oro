import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue'

/**
 * GET /api/dashboard/independent-owner
 *
 * Independent Salon Owner operating dashboard.
 * Answers: performance, utilization, retention, margins, blockers.
 *
 * Returns salon-specific intelligence:
 *   - Revenue vs target, margins, service/product split
 *   - Chair utilization, stylist productivity
 *   - Repeat customer %, rebooking rate
 *   - Retail performance, low-stock blockers
 *   - Per-location breakdowns with stylist leaderboard
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

        // Get franchisor to find all franchises owned
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

        // ── Locations ──────────────────────────────────────────────────
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: {
                id: true, name: true, provisioningStatus: true,
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
            select: { id: true, name: true, franchiseId: true },
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
            },
        })

        // Service vs product revenue split
        const serviceLines = lineItems.filter(li => li.type === 'SERVICE')
        const productLines = lineItems.filter(li => li.type === 'PRODUCT')

        const serviceRevenue = serviceLines.reduce(
            (sum, li) => sum + Number(li.cashLineTotal ?? li.total ?? 0), 0,
        )
        const productRevenue = productLines.reduce(
            (sum, li) => sum + Number(li.cashLineTotal ?? li.total ?? 0), 0,
        )
        const totalLineRevenue = serviceRevenue + productRevenue

        // Product margin calculation
        let productCost = 0
        let productMarginRevenue = 0
        for (const li of productLines) {
            const cost = li.product?.cost ? Number(li.product.cost) : 0
            const rev = Number(li.cashLineTotal ?? li.total ?? 0)
            productCost += cost * (li.quantity || 1)
            productMarginRevenue += rev
        }
        const productMarginPct = productMarginRevenue > 0
            ? ((productMarginRevenue - productCost) / productMarginRevenue * 100)
            : 0

        // ── Stylist productivity ────────────────────────────────────────
        const stylistRevMap = new Map<string, { revenue: number; txns: number; name: string }>()
        for (const li of serviceLines) {
            const sid = li.staffId || 'unknown'
            if (!stylistRevMap.has(sid)) stylistRevMap.set(sid, { revenue: 0, txns: 0, name: '' })
            const entry = stylistRevMap.get(sid)!
            entry.revenue += Number(li.cashLineTotal ?? li.total ?? 0)
            entry.txns++
        }
        // Enrich with names
        for (const emp of employees) {
            if (stylistRevMap.has(emp.id)) {
                stylistRevMap.get(emp.id)!.name = emp.name || `Staff ${emp.id.slice(-4)}`
            }
        }

        const stylistProductivity = Array.from(stylistRevMap.entries())
            .map(([id, data]) => ({
                id, name: data.name || `Staff ${id.slice(-4)}`,
                revenue: data.revenue, services: data.txns,
                avgTicket: data.txns > 0 ? data.revenue / data.txns : 0,
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
        const repeatPct = totalUniqueClients > 0
            ? (repeatClients / totalUniqueClients * 100) : 0

        // Rebooking: clients who have a future appointment
        const futureAppts = await prisma.appointment.count({
            where: {
                locationId: { in: locationIds },
                startTime: { gt: now },
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
            },
        })
        const rebookingRate = completedAppts.length > 0
            ? Math.min(100, (futureAppts / completedAppts.length * 100))
            : 0

        // ── Chair utilization ───────────────────────────────────────────
        // Total available chair-hours in 30 days (assume 10h operating day)
        const operatingDays = 30
        const hoursPerDay = 10
        const totalChairHours = totalChairs * operatingDays * hoursPerDay
        // Booked chair-hours from completed appointments
        const bookedHours = completedAppts.reduce((sum, a) => {
            const dur = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60)
            return sum + Math.min(dur, 12) // cap at 12h
        }, 0)
        const chairUtilization = totalChairHours > 0
            ? (bookedHours / totalChairHours * 100)
            : 0

        // ── Low stock / revenue blockers ────────────────────────────────
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

        // ── Per-location breakdown ──────────────────────────────────────
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
                ? (locBookedHrs / (locChairs * operatingDays * hoursPerDay) * 100)
                : 0

            return {
                id: loc.id,
                name: loc.name,
                revenue: locRevenue,
                appointments: locAppts.length,
                chairs: locChairs,
                chairUtilization: locChairUtil,
                transactions: locTx.length,
            }
        })

        // ── Active exceptions ───────────────────────────────────────────
        let activeExceptions = 0
        try {
            activeExceptions = await prisma.storeException.count({
                where: {
                    locationId: { in: locationIds },
                    resolvedAt: null,
                },
            })
        } catch { /* table may not exist */ }

        return NextResponse.json({
            summary: {
                revenue: currentRevenue,
                priorRevenue,
                revDelta,
                totalTransactions: currentTx.length,
                avgTicket: currentTx.length > 0 ? currentRevenue / currentTx.length : 0,
                totalLocations: locations.length,
                totalStylists: employees.length,
                totalChairs,
            },
            utilization: {
                chairUtilization,
                bookedHours,
                totalChairHours,
                completedAppointments: completedAppts.length,
                noShows: noShows.length,
                noShowRate: totalAppts > 0 ? (noShows.length / totalAppts * 100) : 0,
            },
            retention: {
                totalUniqueClients,
                repeatClients,
                repeatPct,
                rebookingRate,
                futureBookings: futureAppts,
            },
            serviceMix: {
                serviceRevenue,
                productRevenue,
                servicePct: totalLineRevenue > 0 ? (serviceRevenue / totalLineRevenue * 100) : 0,
                productPct: totalLineRevenue > 0 ? (productRevenue / totalLineRevenue * 100) : 0,
                topServices,
            },
            margins: {
                productCost,
                productMarginRevenue,
                productMarginPct,
            },
            retail: {
                lowStockCount: lowStockProducts.length,
                lowStockItems: lowStockProducts.map(p => ({
                    id: p.id, name: p.name,
                    stock: p.stock, reorderPoint: p.reorderPoint,
                    price: Number(p.cashPrice ?? p.price ?? 0),
                })),
                productRevenue,
            },
            stylistProductivity,
            locationBreakdown,
            activeExceptions,
            fetchedAt: fetchedAt.toISOString(),
        })
    } catch (error) {
        console.error('[INDEPENDENT_OWNER_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
    }
}
