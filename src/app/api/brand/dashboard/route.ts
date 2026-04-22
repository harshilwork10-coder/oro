import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue, resolveRevenue } from '@/lib/utils/resolveTransactionRevenue'

/**
 * GET /api/brand/dashboard
 *
 * Franchisor CEO Command Center — deep, store-level data.
 *
 * Shape:
 *   - brand meta
 *   - executive KPIs (network revenue, same-store growth, health score)
 *   - franchisees[] with per-franchisee stats, health score, avg ticket
 *   - stores[] with per-location revenue, txns, appointments, no-show %, growth, avg ticket
 *   - regions[] aggregated from franchise.region + location-level data
 *   - royalties { collected, due, overdue, byFranchisee[] }
 *   - rollout { live, pending, blocked, avgDaysToGoLive }
 *   - needs-attention items
 */
export async function GET(req: NextRequest) {
    const fetchedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ── Resolve franchisor ──
        let franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id },
            select: { id: true, name: true, brandCode: true, businessType: true },
        })
        if (!franchisor) {
            const membership = await prisma.franchisorMembership.findFirst({
                where: { userId: user.id },
                include: { franchisor: { select: { id: true, name: true, brandCode: true, businessType: true } } },
            })
            franchisor = membership?.franchisor ?? null
        }

        if (!franchisor) {
            return NextResponse.json({
                name: 'Brand HQ', brandCode: null,
                kpis: {}, franchisees: [], stores: [], regions: [],
                royalties: { collected: 0, due: 0, overdue: 0, byFranchisee: [] },
                rollout: { live: 0, pending: 0, blocked: 0, avgDaysToGoLive: 0 },
                attentionItems: [],
                fetchedAt: fetchedAt.toISOString(),
            })
        }

        // ── Date boundaries ──
        const now = Date.now()
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000)

        // ── Franchises + Locations ──
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: {
                id: true, name: true, region: true,
                owner: { select: { id: true, name: true, email: true } },
                locations: {
                    select: {
                        id: true, name: true, address: true,
                        provisioningStatus: true, createdAt: true,
                    },
                },
            },
        })

        const franchiseIds = franchises.map(f => f.id)
        const allLocations = franchises.flatMap(f => f.locations.map(l => ({
            ...l, franchiseId: f.id,
            franchiseName: f.owner?.name || f.name || 'Unknown',
            region: f.region || 'Unassigned',
        })))
        const locationIds = allLocations.map(l => l.id)

        // ── Transactions (60 days) ──
        const allTx = franchiseIds.length > 0
            ? await prisma.transaction.findMany({
                  where: {
                      franchiseId: { in: franchiseIds },
                      createdAt: { gte: sixtyDaysAgo },
                      status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
                  },
                  select: {
                      franchiseId: true,
                      locationId: true,
                      clientId: true,
                      total: true,
                      totalCash: true,
                      chargedMode: true,
                      createdAt: true,
                  },
              })
            : []

        const currentTx = allTx.filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
        const priorTx = allTx.filter(t => new Date(t.createdAt) >= sixtyDaysAgo && new Date(t.createdAt) < thirtyDaysAgo)

        // ── Appointments (30 days, for no-show %) ──
        const appointments = locationIds.length > 0
            ? await prisma.appointment.findMany({
                  where: {
                      locationId: { in: locationIds },
                      startTime: { gte: thirtyDaysAgo },
                  },
                  select: { locationId: true, status: true },
              })
            : []

        // ── Employee counts ──
        const employeeCounts = franchiseIds.length > 0
            ? await prisma.user.groupBy({
                  by: ['franchiseId'],
                  where: { franchiseId: { in: franchiseIds } },
                  _count: true,
              })
            : []
        const employeeByFranchise = new Map<string, number>()
        let totalEmployees = 0
        for (const ec of employeeCounts) {
            if (ec.franchiseId) {
                employeeByFranchise.set(ec.franchiseId, ec._count)
                totalEmployees += ec._count
            }
        }

        // ── Royalty Records ──
        let royaltyRecords: any[] = []
        try {
            royaltyRecords = await prisma.royaltyRecord.findMany({
                where: { franchiseId: { in: franchiseIds } },
                select: {
                    franchiseId: true, grossRevenue: true, royaltyAmount: true,
                    status: true, paidAt: true, periodStart: true, periodEnd: true,
                },
            })
        } catch { /* table may not exist */ }

        // ── Pending station requests ──
        let stationRequests = 0
        try {
            stationRequests = await prisma.onboardingRequest.count({
                where: { franchisorId: franchisor.id, status: { in: [1, 2, 3] } },
            })
        } catch { /* table may not exist */ }

        // ═══════════════════════════════════════════
        // STORE-LEVEL COMPUTATION
        // ═══════════════════════════════════════════

        // Group transactions by location
        const txByLocation = new Map<string, typeof currentTx>()
        const priorTxByLocation = new Map<string, typeof priorTx>()
        for (const tx of currentTx) {
            const lid = tx.locationId || '_none'
            if (!txByLocation.has(lid)) txByLocation.set(lid, [])
            txByLocation.get(lid)!.push(tx)
        }
        for (const tx of priorTx) {
            const lid = tx.locationId || '_none'
            if (!priorTxByLocation.has(lid)) priorTxByLocation.set(lid, [])
            priorTxByLocation.get(lid)!.push(tx)
        }

        // Group appointments by location
        const apptsByLocation = new Map<string, typeof appointments>()
        for (const appt of appointments) {
            if (!apptsByLocation.has(appt.locationId)) apptsByLocation.set(appt.locationId, [])
            apptsByLocation.get(appt.locationId)!.push(appt)
        }

        // Build store-level data
        const stores = allLocations.map(loc => {
            const locCurrentTx = txByLocation.get(loc.id) || []
            const locPriorTx = priorTxByLocation.get(loc.id) || []
            const locAppts = apptsByLocation.get(loc.id) || []

            const revenue = sumRevenue(locCurrentTx)
            const priorRevenue = sumRevenue(locPriorTx)
            const growth = priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue * 100) : (revenue > 0 ? 100 : 0)
            const txnCount = locCurrentTx.length
            const avgTicket = txnCount > 0 ? revenue / txnCount : 0

            // Unique customers
            const uniqueClients = new Set(locCurrentTx.filter(t => t.clientId).map(t => t.clientId))
            const priorClients = new Set(locPriorTx.filter(t => t.clientId).map(t => t.clientId))
            const repeatClients = [...uniqueClients].filter(c => priorClients.has(c))
            const repeatPct = uniqueClients.size > 0 ? (repeatClients.length / uniqueClients.size * 100) : 0

            // No-show %
            const totalAppts = locAppts.length
            const noShows = locAppts.filter(a => a.status === 'NO_SHOW').length
            const noShowPct = totalAppts > 0 ? (noShows / totalAppts * 100) : 0

            // Health score (0-100)
            let health = 100
            if (revenue === 0 && loc.provisioningStatus === 'ACTIVE') health -= 40
            if (growth < -25) health -= 25
            else if (growth < -10) health -= 10
            if (noShowPct > 20) health -= 10
            if (txnCount < 5 && loc.provisioningStatus === 'ACTIVE') health -= 15
            health = Math.max(0, Math.min(100, health))

            // Top issue
            let topIssue = null
            if (revenue === 0 && loc.provisioningStatus === 'ACTIVE') topIssue = 'Zero revenue with active status'
            else if (growth < -25) topIssue = `Revenue down ${Math.abs(growth).toFixed(0)}%`
            else if (noShowPct > 20) topIssue = `High no-show rate (${noShowPct.toFixed(0)}%)`
            else if (txnCount < 5 && loc.provisioningStatus === 'ACTIVE') topIssue = 'Very low transaction volume'

            return {
                id: loc.id,
                name: loc.name,
                address: loc.address,
                franchiseId: loc.franchiseId,
                franchisee: loc.franchiseName,
                region: loc.region,
                status: loc.provisioningStatus || 'ACTIVE',
                revenue,
                priorRevenue,
                growth,
                avgTicket,
                txnCount,
                repeatPct,
                noShowPct,
                totalAppts,
                health,
                topIssue,
                createdAt: loc.createdAt,
            }
        })

        // ═══════════════════════════════════════════
        // FRANCHISEE-LEVEL COMPUTATION
        // ═══════════════════════════════════════════

        const currentByFranchise = new Map<string, typeof currentTx>()
        const priorByFranchise = new Map<string, typeof priorTx>()
        for (const tx of currentTx) {
            if (!tx.franchiseId) continue
            if (!currentByFranchise.has(tx.franchiseId)) currentByFranchise.set(tx.franchiseId, [])
            currentByFranchise.get(tx.franchiseId)!.push(tx)
        }
        for (const tx of priorTx) {
            if (!tx.franchiseId) continue
            if (!priorByFranchise.has(tx.franchiseId)) priorByFranchise.set(tx.franchiseId, [])
            priorByFranchise.get(tx.franchiseId)!.push(tx)
        }

        let underperformingCount = 0
        const franchiseeData = franchises.map(f => {
            const fCurrent = currentByFranchise.get(f.id) || []
            const fPrior = priorByFranchise.get(f.id) || []
            const monthlyRevenue = sumRevenue(fCurrent)
            const priorRevenue = sumRevenue(fPrior)
            const growth = priorRevenue > 0 ? ((monthlyRevenue - priorRevenue) / priorRevenue * 100) : (monthlyRevenue > 0 ? 100 : 0)
            const employeeCount = employeeByFranchise.get(f.id) || 0
            const txnCount = fCurrent.length
            const avgTicket = txnCount > 0 ? monthlyRevenue / txnCount : 0

            // Royalties for this franchisee
            const fRoyalties = royaltyRecords.filter(r => r.franchiseId === f.id)
            const royaltiesDue = fRoyalties.reduce((s: number, r: any) => s + Number(r.royaltyAmount), 0)
            const royaltiesCollected = fRoyalties.filter((r: any) => r.status === 'PAID').reduce((s: number, r: any) => s + Number(r.royaltyAmount), 0)

            let status: 'active' | 'warning' | 'pending' | 'critical' = 'active'
            if (f.locations.length === 0) {
                status = 'pending'
            } else if (monthlyRevenue === 0 && f.locations.length > 0) {
                status = 'critical'
                underperformingCount++
            } else if (priorRevenue > 0 && monthlyRevenue < priorRevenue * 0.75) {
                status = 'warning'
                underperformingCount++
            }

            // Health score
            let health = 100
            if (status === 'critical') health -= 50
            else if (status === 'warning') health -= 25
            if (growth < -25) health -= 15
            if (employeeCount === 0 && f.locations.length > 0) health -= 10
            health = Math.max(0, Math.min(100, health))

            return {
                id: f.id,
                name: f.owner?.name || f.name || `Franchisee ${f.id.slice(0, 6)}`,
                region: f.region || 'Unassigned',
                locationCount: f.locations.length,
                monthlyRevenue,
                priorRevenue,
                growth,
                transactionCount: txnCount,
                avgTicket,
                employeeCount,
                royaltiesDue,
                royaltiesCollected,
                status,
                health,
            }
        })

        // ═══════════════════════════════════════════
        // REGION-LEVEL COMPUTATION
        // ═══════════════════════════════════════════

        const regionMap = new Map<string, {
            region: string, revenue: number, priorRevenue: number, stores: number,
            weakStores: number, openings: number, franchisees: Set<string>,
            topFranchisee: string, topFranchiseeRev: number,
        }>()

        for (const store of stores) {
            const r = store.region || 'Unassigned'
            if (!regionMap.has(r)) {
                regionMap.set(r, {
                    region: r, revenue: 0, priorRevenue: 0, stores: 0,
                    weakStores: 0, openings: 0, franchisees: new Set(),
                    topFranchisee: '', topFranchiseeRev: 0,
                })
            }
            const reg = regionMap.get(r)!
            reg.revenue += store.revenue
            reg.priorRevenue += store.priorRevenue
            reg.stores++
            if (store.health < 60) reg.weakStores++
            if (store.status === 'PROVISIONING_PENDING' || store.status === 'READY_FOR_INSTALL') reg.openings++
            reg.franchisees.add(store.franchiseId)
        }

        // Find top franchisee per region
        for (const [, reg] of regionMap) {
            for (const fId of reg.franchisees) {
                const fData = franchiseeData.find(f => f.id === fId)
                if (fData && fData.monthlyRevenue > reg.topFranchiseeRev) {
                    reg.topFranchisee = fData.name
                    reg.topFranchiseeRev = fData.monthlyRevenue
                }
            }
        }

        const regions = [...regionMap.values()].map(r => ({
            region: r.region,
            revenue: r.revenue,
            priorRevenue: r.priorRevenue,
            growth: r.priorRevenue > 0 ? ((r.revenue - r.priorRevenue) / r.priorRevenue * 100) : 0,
            stores: r.stores,
            weakStores: r.weakStores,
            openings: r.openings,
            franchiseeCount: r.franchisees.size,
            topFranchisee: r.topFranchisee,
            concern: r.weakStores > r.stores * 0.3 ? 'high' : r.weakStores > 0 ? 'moderate' : 'low',
        })).sort((a, b) => b.revenue - a.revenue)

        // ═══════════════════════════════════════════
        // ROLLOUT
        // ═══════════════════════════════════════════

        const locationBreakdown = {
            active: allLocations.filter(l => l.provisioningStatus === 'ACTIVE' || !l.provisioningStatus).length,
            pending: allLocations.filter(l =>
                l.provisioningStatus === 'PROVISIONING_PENDING' || l.provisioningStatus === 'PROVISIONING' || l.provisioningStatus === 'READY_FOR_INSTALL',
            ).length,
            offline: allLocations.filter(l =>
                l.provisioningStatus === 'SUSPENDED' || l.provisioningStatus === 'DEACTIVATED',
            ).length,
        }

        // Average days to go-live for active locations
        const activeLocations = allLocations.filter(l => l.provisioningStatus === 'ACTIVE' || !l.provisioningStatus)
        const avgDaysToGoLive = activeLocations.length > 0
            ? activeLocations.reduce((sum, l) => {
                  const daysOld = Math.floor((now - new Date(l.createdAt).getTime()) / (24 * 60 * 60 * 1000))
                  return sum + daysOld
              }, 0) / activeLocations.length
            : 0

        // ═══════════════════════════════════════════
        // ROYALTIES SUMMARY
        // ═══════════════════════════════════════════

        const royaltiesCollected = royaltyRecords
            .filter(r => r.status === 'PAID')
            .reduce((s, r) => s + Number(r.royaltyAmount), 0)
        const royaltiesDue = royaltyRecords
            .reduce((s, r) => s + Number(r.royaltyAmount), 0)
        const royaltiesOverdue = royaltyRecords
            .filter(r => r.status === 'PENDING' || r.status === 'OVERDUE')
            .reduce((s, r) => s + Number(r.royaltyAmount), 0)

        // ═══════════════════════════════════════════
        // NETWORK KPIs
        // ═══════════════════════════════════════════

        const networkRevenue = sumRevenue(currentTx)
        const priorRevenue = sumRevenue(priorTx)
        const sameStoreGrowth = priorRevenue > 0 ? ((networkRevenue - priorRevenue) / priorRevenue * 100) : 0

        // Network health score (average of franchisee health scores)
        const avgHealth = franchiseeData.length > 0
            ? Math.round(franchiseeData.reduce((s, f) => s + f.health, 0) / franchiseeData.length)
            : 100

        // ═══════════════════════════════════════════
        // NEEDS ATTENTION TODAY
        // ═══════════════════════════════════════════

        const attentionItems: any[] = []

        // Underperforming franchisees
        const criticalFranchisees = franchiseeData.filter(f => f.status === 'critical')
        if (criticalFranchisees.length > 0) {
            attentionItems.push({
                type: 'critical-franchisee', severity: 'critical',
                title: `${criticalFranchisees.length} franchisee(s) at $0 revenue`,
                description: criticalFranchisees.map(f => f.name).join(', '),
                count: criticalFranchisees.length,
                category: 'performance',
            })
        }

        const warningFranchisees = franchiseeData.filter(f => f.status === 'warning')
        if (warningFranchisees.length > 0) {
            attentionItems.push({
                type: 'declining-franchisee', severity: 'warning',
                title: `${warningFranchisees.length} franchisee(s) declining >25%`,
                description: warningFranchisees.map(f => `${f.name} (${f.growth.toFixed(0)}%)`).join(', '),
                count: warningFranchisees.length,
                category: 'performance',
            })
        }

        // Delayed openings
        if (locationBreakdown.pending > 0) {
            attentionItems.push({
                type: 'pending-openings', severity: 'warning',
                title: `${locationBreakdown.pending} location(s) pending go-live`,
                description: 'Locations registered but not yet operational.',
                count: locationBreakdown.pending,
                category: 'rollout',
            })
        }

        // Royalty variance
        if (royaltiesOverdue > 0) {
            attentionItems.push({
                type: 'royalty-overdue', severity: 'warning',
                title: `Royalty variance: ${royaltiesOverdue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} outstanding`,
                description: 'Uncollected royalties across franchisees.',
                count: 1,
                category: 'financial',
            })
        }

        // Stores with severe drops
        const severeDropStores = stores.filter(s => s.growth < -30 && s.priorRevenue > 0)
        if (severeDropStores.length > 0) {
            attentionItems.push({
                type: 'severe-drop-stores', severity: 'critical',
                title: `${severeDropStores.length} store(s) with severe revenue drop (>30%)`,
                description: severeDropStores.slice(0, 3).map(s => `${s.name} (${s.growth.toFixed(0)}%)`).join(', '),
                count: severeDropStores.length,
                category: 'performance',
            })
        }

        // Station requests pending
        if (stationRequests > 0) {
            attentionItems.push({
                type: 'station-requests', severity: 'info',
                title: `${stationRequests} station request(s) pending`,
                description: 'Device provisioning requests awaiting review.',
                count: stationRequests,
                category: 'rollout',
            })
        }

        // Declining regions
        const decliningRegions = regions.filter(r => r.growth < -10 && r.priorRevenue > 0)
        if (decliningRegions.length > 0) {
            attentionItems.push({
                type: 'declining-regions', severity: 'warning',
                title: `${decliningRegions.length} region(s) declining`,
                description: decliningRegions.map(r => `${r.region} (${r.growth.toFixed(0)}%)`).join(', '),
                count: decliningRegions.length,
                category: 'regional',
            })
        }

        return NextResponse.json({
            name: franchisor.name || 'Brand HQ',
            brandCode: franchisor.brandCode || null,
            // Executive KPIs
            kpis: {
                networkRevenue,
                priorRevenue,
                sameStoreGrowth,
                activeLocations: locationBreakdown.active,
                totalLocations: allLocations.length,
                pendingOpenings: locationBreakdown.pending,
                royaltiesCollected,
                royaltiesDue,
                royaltiesOverdue,
                franchiseeHealthScore: avgHealth,
                totalFranchisees: franchises.length,
                totalEmployees,
                totalTransactions: currentTx.length,
            },
            franchisees: franchiseeData,
            stores,
            regions,
            royalties: {
                collected: royaltiesCollected,
                due: royaltiesDue,
                overdue: royaltiesOverdue,
                byFranchisee: franchiseeData.map(f => ({
                    id: f.id, name: f.name,
                    due: f.royaltiesDue, collected: f.royaltiesCollected,
                    variance: f.royaltiesDue - f.royaltiesCollected,
                })).filter(f => f.due > 0 || f.collected > 0),
            },
            rollout: {
                live: locationBreakdown.active,
                pending: locationBreakdown.pending,
                blocked: locationBreakdown.offline,
                stationRequests,
                avgDaysToGoLive: Math.round(avgDaysToGoLive),
            },
            attentionItems,
            fetchedAt: fetchedAt.toISOString(),
        })
    } catch (error) {
        console.error('[BRAND_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
