import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue'

/**
 * GET /api/brand/dashboard
 *
 * Franchisor HQ operating dashboard — powers FranchisorCommandCenter.
 *
 * Returns the full data shape:
 *   - name, brandCode
 *   - totalFranchisees, totalLocations, totalEmployees, totalTransactions
 *   - monthlyRevenue, priorPeriodRevenue (cash-equivalent via resolveRevenue)
 *   - franchisees[] with per-franchisee revenue, txns, staff, status
 *   - locationBreakdown { active, pending, offline } using provisioningStatus
 *   - pendingItems { stationRequests, pendingLocations, underperformingFranchisees }
 *   - fetchedAt
 */
export async function GET(req: NextRequest) {
    const fetchedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ── Resolve franchisor for the calling user ─────────────────────
        let franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id },
            select: { id: true, name: true, brandCode: true, businessType: true },
        })

        // Fallback: check membership
        if (!franchisor) {
            const membership = await prisma.franchisorMembership.findFirst({
                where: { userId: user.id },
                include: {
                    franchisor: {
                        select: { id: true, name: true, brandCode: true, businessType: true },
                    },
                },
            })
            franchisor = membership?.franchisor ?? null
        }

        if (!franchisor) {
            return NextResponse.json({
                name: 'Brand HQ',
                brandCode: null,
                totalFranchisees: 0,
                totalLocations: 0,
                totalEmployees: 0,
                totalTransactions: 0,
                monthlyRevenue: 0,
                priorPeriodRevenue: 0,
                franchisees: [],
                locationBreakdown: { active: 0, pending: 0, offline: 0 },
                pendingItems: { stationRequests: 0, pendingLocations: 0, underperformingFranchisees: 0 },
                fetchedAt: fetchedAt.toISOString(),
            })
        }

        // ── Date boundaries ─────────────────────────────────────────────
        const now = Date.now()
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000)

        // ── Franchises + Locations ──────────────────────────────────────
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: {
                id: true,
                name: true,
                owner: { select: { id: true, name: true, email: true } },
                locations: {
                    select: {
                        id: true,
                        name: true,
                        provisioningStatus: true,
                    },
                },
            },
        })

        const franchiseIds = franchises.map((f) => f.id)

        // ── Transactions: Current 30 days + Prior 30 days (uses cash-equivalent) ──
        const allTx = franchiseIds.length > 0
            ? await prisma.transaction.findMany({
                  where: {
                      franchiseId: { in: franchiseIds },
                      createdAt: { gte: sixtyDaysAgo },
                      status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
                  },
                  select: {
                      franchiseId: true,
                      total: true,
                      totalCash: true,
                      chargedMode: true,
                      createdAt: true,
                  },
              })
            : []

        // Partition transactions by period
        const currentTx = allTx.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo)
        const priorTx = allTx.filter(
            (t) => new Date(t.createdAt) >= sixtyDaysAgo && new Date(t.createdAt) < thirtyDaysAgo,
        )

        // Group by franchise
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

        // ── Employee counts ─────────────────────────────────────────────
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

        // ── Pending station / onboarding requests ───────────────────────
        let stationRequests = 0
        try {
            stationRequests = await prisma.onboardingRequest.count({
                where: {
                    franchisorId: franchisor.id,
                    status: { in: [1, 2, 3] }, // SUBMITTED, IN_REVIEW, WAITING_DOCS
                },
            })
        } catch {
            // table may not exist in all envs
        }

        // ── Per-franchisee rollup ───────────────────────────────────────
        let underperformingCount = 0

        const franchiseeData = franchises.map((f) => {
            const fCurrent = currentByFranchise.get(f.id) || []
            const fPrior = priorByFranchise.get(f.id) || []
            const monthlyRevenue = sumRevenue(fCurrent)
            const priorRevenue = sumRevenue(fPrior)
            const employeeCount = employeeByFranchise.get(f.id) || 0

            let status: 'active' | 'warning' | 'pending' = 'active'
            if (f.locations.length === 0) {
                status = 'pending'
            } else if (priorRevenue > 0 && monthlyRevenue < priorRevenue * 0.75) {
                status = 'warning'
                underperformingCount++
            } else if (monthlyRevenue === 0 && f.locations.length > 0) {
                status = 'warning'
                underperformingCount++
            }

            return {
                id: f.id,
                name: f.owner?.name || f.name || f.owner?.email || `Franchisee ${f.id.slice(0, 6)}`,
                locationCount: f.locations.length,
                monthlyRevenue,
                priorRevenue,
                transactionCount: fCurrent.length,
                employeeCount,
                status,
            }
        })

        // ── Location breakdown (from provisioningStatus, NOT user count) ─
        const allLocations = franchises.flatMap((f) => f.locations)

        const locationBreakdown = {
            active: allLocations.filter(
                (l) => l.provisioningStatus === 'ACTIVE' || !l.provisioningStatus,
            ).length,
            pending: allLocations.filter(
                (l) =>
                    l.provisioningStatus === 'PROVISIONING_PENDING' ||
                    l.provisioningStatus === 'PROVISIONING',
            ).length,
            offline: allLocations.filter(
                (l) =>
                    l.provisioningStatus === 'SUSPENDED' ||
                    l.provisioningStatus === 'DEACTIVATED',
            ).length,
        }

        // ── Aggregate totals ────────────────────────────────────────────
        const monthlyRevenue = sumRevenue(currentTx)
        const priorPeriodRevenue = sumRevenue(priorTx)

        return NextResponse.json({
            name: franchisor.name || 'Brand HQ',
            brandCode: franchisor.brandCode || null,
            totalFranchisees: franchises.length,
            totalLocations: allLocations.length,
            totalEmployees,
            totalTransactions: currentTx.length,
            monthlyRevenue,
            priorPeriodRevenue,
            franchisees: franchiseeData,
            locationBreakdown,
            pendingItems: {
                stationRequests,
                pendingLocations: locationBreakdown.pending,
                underperformingFranchisees: underperformingCount,
            },
            fetchedAt: fetchedAt.toISOString(),
        })
    } catch (error) {
        console.error('[BRAND_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
