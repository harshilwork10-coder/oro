import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/franchisor/dashboard
 *
 * Lightweight dashboard summary for the franchisor reports page.
 * Returns today's sales, transactions, employee count, and active locations.
 *
 * This is a SEPARATE route from /api/brand/dashboard (the full CEO Command Center).
 * This route is consumed by /dashboard/franchisor/reports — it needs quick stats only.
 */
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // ── Resolve franchisor and their franchises ──
        let franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: { id: true },
        })
        if (!franchisor) {
            const membership = await prisma.franchisorMembership.findFirst({
                where: { userId: authUser.id },
                include: { franchisor: { select: { id: true } } },
            })
            franchisor = membership?.franchisor ?? null
        }

        if (!franchisor) {
            return NextResponse.json({
                totalLocations: 0,
                activeLocations: 0,
                todaySales: 0,
                todayTransactions: 0,
                employeesWorking: 0,
                alerts: 0,
            })
        }

        // ── Get franchise IDs under this franchisor ──
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: franchisor.id },
            select: { id: true, locations: { select: { id: true, provisioningStatus: true } } },
        })

        const franchiseIds = franchises.map(f => f.id)
        const allLocations = franchises.flatMap(f => f.locations)
        const activeLocations = allLocations.filter(
            l => l.provisioningStatus === 'ACTIVE' || !l.provisioningStatus
        )

        // ── Today's date boundaries ──
        const TZ = 'America/Chicago'
        const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
        const startOfToday = new Date(nowLocal)
        startOfToday.setHours(0, 0, 0, 0)

        // ── Today's transactions across all franchises ──
        let todaySales = 0
        let todayTransactions = 0

        if (franchiseIds.length > 0) {
            const todayTx = await prisma.transaction.findMany({
                where: {
                    franchiseId: { in: franchiseIds },
                    createdAt: { gte: startOfToday },
                    status: 'COMPLETED',
                },
                select: { total: true, totalCash: true, chargedMode: true },
            })

            todayTransactions = todayTx.length
            // Use totalCash for card transactions (dual pricing), total for cash
            todaySales = todayTx.reduce((sum, tx) => {
                if (tx.chargedMode === 'CARD' && tx.totalCash != null) {
                    return sum + Number(tx.totalCash)
                }
                return sum + Number(tx.total)
            }, 0)
        }

        // ── Employee count (total across franchises) ──
        const employeesWorking = franchiseIds.length > 0
            ? await prisma.user.count({
                  where: { franchiseId: { in: franchiseIds }, isActive: true },
              })
            : 0

        return NextResponse.json({
            totalLocations: allLocations.length,
            activeLocations: activeLocations.length,
            todaySales,
            todayTransactions,
            employeesWorking,
            alerts: 0, // TODO: aggregate from exceptions table
        })
    } catch (error) {
        console.error('[FRANCHISOR_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
