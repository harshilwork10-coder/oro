import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Allow PROVIDER and FRANCHISOR roles
        if (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get franchisor ID if user is a franchisor
        let franchisorId: string | null = null
        if (session.user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: session.user.id }
            })
            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
            }
            franchisorId = franchisor.id
        }

        // Get franchises - filter by franchisor if not PROVIDER
        const franchises = await prisma.franchise.findMany({
            where: franchisorId ? { franchisorId } : undefined,
            include: {
                franchisor: {
                    include: {
                        owner: true
                    }
                },
                users: true,
                locations: {
                    include: {
                        users: true, // employees
                        appointments: true
                    }
                }
            }
        })

        // Calculate health scores for each franchise
        const franchiseesWithScores = await Promise.all(
            franchises.map(async (franchise) => {
                // Get franchisee owner (user linked to this franchise)
                const franchiseeOwner = franchise.users.find(u => u.franchiseId === franchise.id)

                if (!franchiseeOwner) {
                    return null // Skip franchises without an owner
                }

                // Calculate metrics
                const totalLocations = franchise.locations.length
                const totalEmployees = franchise.locations.reduce((sum, loc) => sum + loc.users.length, 0)

                // Calculate revenue from transactions
                // Mocked for now as Appointment -> Transaction relation is missing
                const totalRevenue = 0
                /*
                const totalRevenue = franchise.locations.reduce((sum, loc) => {
                    const locationRevenue = loc.appointments.reduce((locSum, apt) => {
                        return locSum + (apt.transaction ? Number(apt.transaction.amount) : 0)
                    }, 0)
                    return sum + locationRevenue
                }, 0)
                */

                // Calculate monthly revenue (last 30 days)
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                const monthlyRevenue = 0
                /*
                const monthlyRevenue = franchise.locations.reduce((sum, loc) => {
                    const locationRevenue = loc.appointments
                        .filter(apt => apt.transaction && new Date(apt.transaction.date) >= thirtyDaysAgo)
                        .reduce((locSum, apt) => locSum + Number(apt.transaction!.amount), 0)
                    return sum + locationRevenue
                }, 0)
                */

                // Calculate compliance score
                const totalAppointments = franchise.locations.reduce((sum, loc) => sum + loc.appointments.length, 0)
                const completedAppointments = franchise.locations.reduce((sum, loc) => {
                    return sum + loc.appointments.filter(apt => apt.status === 'COMPLETED').length
                }, 0)
                const complianceScore = totalAppointments > 0
                    ? Math.round((completedAppointments / totalAppointments) * 100)
                    : 85

                const customerSat = complianceScore
                const employeeRetention = 85

                // Calculate growth
                const sixtyDaysAgo = new Date()
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

                const previousMonthRevenue = 0
                /*
                const previousMonthRevenue = franchise.locations.reduce((sum, loc) => {
                    const locationRevenue = loc.appointments
                        .filter(apt => {
                            if (!apt.transaction) return false
                            const date = new Date(apt.transaction.date)
                            return date >= sixtyDaysAgo && date < thirtyDaysAgo
                        })
                        .reduce((locSum, apt) => locSum + Number(apt.transaction!.amount), 0)
                    return sum + locationRevenue
                }, 0)
                */

                const growthRate = previousMonthRevenue > 0
                    ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
                    : 0

                const revenueScore = Math.min(100, (monthlyRevenue / 50000) * 100)

                // Calculate overall health score
                const healthScore = Math.round(
                    (revenueScore * 0.30) +
                    (complianceScore * 0.25) +
                    (customerSat * 0.20) +
                    (employeeRetention * 0.15) +
                    (Math.min(100, Math.max(0, 50 + growthRate)) * 0.10)
                )

                const trend = growthRate > 0 ? 'up' : 'down'

                return {
                    id: franchise.id,
                    name: franchiseeOwner.name || 'Unknown',
                    email: franchiseeOwner.email,
                    phone: franchiseeOwner.email,
                    franchiseName: franchise.name,
                    franchisorName: franchise.franchisor.name, // Add franchisor context
                    contractStart: franchiseeOwner.createdAt.toISOString(),
                    contractEnd: new Date(franchiseeOwner.createdAt.getTime() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                    healthScore,
                    locations: totalLocations,
                    totalRevenue: Math.round(monthlyRevenue),
                    complianceScore,
                    employeeCount: totalEmployees,
                    trend,
                    breakdown: {
                        revenue: Math.round(revenueScore),
                        compliance: complianceScore,
                        customerSat,
                        employeeRetention,
                        growth: Math.round(Math.min(100, Math.max(0, 50 + growthRate)))
                    }
                }
            })
        )

        // Filter out null values and sort by health score
        const validFranchisees = franchiseesWithScores
            .filter(f => f !== null)
            .sort((a, b) => b!.healthScore - a!.healthScore)

        return NextResponse.json(validFranchisees)
    } catch (error) {
        console.error('Error fetching franchisees:', error)
        return NextResponse.json(
            { error: 'Failed to fetch franchisees' },
            { status: 500 }
        )
    }
}
