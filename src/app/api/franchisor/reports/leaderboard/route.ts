import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Location Leaderboard API
 * Compares all locations by key metrics
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'mtd' // mtd, week, today

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisorMemberships: {
                    include: { franchisor: true }
                }
            }
        }) as any

        const franchisorId = user?.franchisorMemberships?.[0]?.franchisor?.id
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

        // Get transactions per location
        const transactions = await prisma.transaction.findMany({
            where: {
                locationId: { in: locationIds },
                createdAt: { gte: startDate },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }
            },
            select: {
                id: true,
                total: true,
                locationId: true,
                clientId: true,
                appointmentId: true,
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

        // Build leaderboard
        const leaderboard = locations.map(loc => {
            const locTransactions = transactions.filter(t => t.locationId === loc.id)
            const locAppointments = appointments.filter(a => a.locationId === loc.id)

            const revenue = locTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
            const appointmentsCompleted = locAppointments.filter(a => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT').length
            const walkIns = locTransactions.filter(t => !t.appointmentId).length
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
