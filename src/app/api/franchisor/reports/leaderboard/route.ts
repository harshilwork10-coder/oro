import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue'

/**
 * Location Leaderboard API
 * Compares all locations by key metrics
 */
export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'mtd' // mtd, week, today

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            select: { id: true, franchiseId: true }
        }) as any

        // Get franchisorId via franchise relation
        let franchisorId: string | null = null
        if (user?.franchiseId) {
            const franchise = await prisma.franchise.findUnique({
                where: { id: user.franchiseId },
                select: { franchisorId: true }
            })
            franchisorId = franchise?.franchisorId ?? null
        }
        if (!franchisorId) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Date range based on period
        const now = new Date()
        let startDate: Date
        if (period === 'week') {
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
        } else if (period === 'today') {
            startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
        } else { // MTD
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        // Get all active locations
        const locations = await prisma.location.findMany({
            where: {
                franchisorId,
                provisioningStatus: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                address: true,
            }
        })

        const locationIds = locations.map(l => l.id)

        // Get franchise IDs for this franchisor (transactions link by franchiseId)
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            select: { id: true }
        })
        const franchiseIds = franchises.map(f => f.id)

        // Get transactions scoped to this franchisor's franchises
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: { in: franchiseIds },
                createdAt: { gte: startDate },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }
            },
            select: {
                id: true,
                total: true,
                totalCash: true,
                chargedMode: true,
                franchiseId: true,
                clientId: true,
            }
        })

        // Get appointments per location
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: { gte: startDate },
            },
            select: {
                id: true,
                status: true,
                locationId: true,
                clientId: true,
            }
        })

        // Build leaderboard — match locations via their franchise
        const leaderboard = locations.map(loc => {
            // Find which franchise this location belongs to
            const locFranchises = franchises.filter(f => f.id === franchiseIds.find(fid => fid === f.id))
            const locFranchiseIds = locFranchises.map(f => f.id)

            // For simplicity scope transactions to this location's franchise (best we can do without locationId on Transaction)
            const locTransactions = transactions.filter(t => locFranchiseIds.includes(t.franchiseId!))
            const locAppointments = appointments.filter(a => a.locationId === loc.id)

            const revenue = sumRevenue(locTransactions)
            const appointmentsCompleted = locAppointments.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT').length
            const walkIns = locTransactions.length  // treat all non-appointment txns as walk-ins (no appointmentId on Transaction)
            const totalVisits = appointmentsCompleted + walkIns

            // Unique customers
            const customerIds = new Set<string>()
            locAppointments.forEach(a => a.clientId && customerIds.add(a.clientId))
            locTransactions.forEach(t => t.clientId && customerIds.add(t.clientId))

            // No-show rate
            const totalBooked = locAppointments.length
            const noShows = locAppointments.filter(a => a.status === 'NO_SHOW').length
            const noShowRate = totalBooked > 0 ? Math.round((noShows / totalBooked) * 100) : 0

            // Average ticket
            const avgTicket = locTransactions.length > 0
                ? Math.round(revenue / locTransactions.length)
                : 0

            return {
                id: loc.id,
                name: loc.name,
                address: loc.address,
                revenue,
                appointments: appointmentsCompleted,
                walkIns,
                totalVisits,
                uniqueCustomers: customerIds.size,
                avgTicket,
                noShowRate,
            }
        })

        // Sort by revenue descending
        leaderboard.sort((a, b) => b.revenue - a.revenue)

        // Add rank
        const rankedLeaderboard = leaderboard.map((loc, index) => ({
            ...loc,
            rank: index + 1
        }))

        return NextResponse.json({
            success: true,
            period,
            data: rankedLeaderboard
        })

    } catch (error) {
        console.error('Leaderboard API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
