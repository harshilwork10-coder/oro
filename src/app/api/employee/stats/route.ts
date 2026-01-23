import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
    try {
        // Support both session (web) and Bearer token (mobile)
        const user = await getAuthUser(req)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const employeeId = user.id
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Fetch today's line items where THIS employee performed the service
        // This is more accurate than transaction.employeeId (who processed the sale)
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                staffId: employeeId,
                transaction: {
                    createdAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    status: 'COMPLETED',
                }
            },
            select: {
                total: true,
                priceCharged: true,
                commissionAmount: true,
                tipAllocated: true,
            }
        })

        // Calculate stats from line items
        const totalRevenue = lineItems.reduce((acc: number, item) => acc + Number(item.priceCharged || item.total || 0), 0)
        const totalTips = lineItems.reduce((acc: number, item) => acc + Number(item.tipAllocated || 0), 0)
        const estimatedCommission = lineItems.reduce((acc: number, item) => acc + Number(item.commissionAmount || 0), 0)

        // If there's no commission calculated, fallback to 50% of revenue
        const finalCommission = estimatedCommission > 0 ? estimatedCommission : totalRevenue * 0.50

        const totalEarnings = finalCommission + totalTips

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

