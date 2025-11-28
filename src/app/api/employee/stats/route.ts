import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const employeeId = session.user.id
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Fetch today's transactions for this employee
        const transactions = await prisma.transaction.findMany({
            where: {
                employeeId,
                createdAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: 'COMPLETED',
            },
            select: {
                total: true,
                tip: true,
                subtotal: true,
            }
        })

        // Calculate stats
        const totalRevenue = transactions.reduce((acc, curr) => acc + Number(curr.subtotal), 0)
        const totalTips = transactions.reduce((acc, curr) => acc + Number(curr.tip), 0)

        // Simple commission calculation (e.g., 40% flat for now, or fetch from CommissionRule)
        // In a real app, we'd fetch the user's commission rule. 
        // For this MVP, we'll assume a standard 40% commission on service revenue.
        const estimatedCommission = totalRevenue * 0.40

        const totalEarnings = estimatedCommission + totalTips

        // Fetch appointment counts
        const appointmentCount = await prisma.appointment.count({
            where: {
                employeeId,
                startTime: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: { not: 'CANCELLED' }
            }
        })

        const completedCount = await prisma.appointment.count({
            where: {
                employeeId,
                startTime: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: 'COMPLETED'
            }
        })

        return NextResponse.json({
            revenue: totalRevenue,
            tips: totalTips,
            commission: estimatedCommission,
            totalEarnings,
            appointments: {
                total: appointmentCount,
                completed: completedCount,
                remaining: appointmentCount - completedCount
            },
            dailyGoal: 500 // Hardcoded goal for now
        })

    } catch (error) {
        console.error('Error fetching employee stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
