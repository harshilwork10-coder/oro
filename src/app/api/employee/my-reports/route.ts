import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        // Support both session (web) and Bearer token (mobile)
        const user = await getAuthUser(req)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        // Get date ranges
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

        const weekStart = new Date(todayStart)
        weekStart.setDate(weekStart.getDate() - 7)

        const monthStart = new Date(todayStart)
        monthStart.setMonth(monthStart.getMonth() - 1)

        // Get today's transactions for this employee
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: {
                    gte: todayStart,
                    lte: todayEnd
                },
                status: 'COMPLETED'
            },
            select: {
                tip: true,
                total: true
            }
        })

        // Get week's transactions
        const weekTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: {
                    gte: weekStart,
                    lte: todayEnd
                },
                status: 'COMPLETED'
            },
            select: {
                tip: true,
                total: true
            }
        })

        // Get month's transactions
        const monthTransactions = await prisma.transaction.findMany({
            where: {
                employeeId: userId,
                createdAt: {
                    gte: monthStart,
                    lte: todayEnd
                },
                status: 'COMPLETED'
            },
            select: {
                tip: true,
                total: true
            }
        })

        // Get today's appointments
        const todayAppointments = await prisma.appointment.findMany({
            where: {
                employeeId: userId,
                startTime: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            select: {
                status: true,
                clientId: true
            }
        })

        // Calculate metrics
        const tipsToday = todayTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)
        const tipsWeek = weekTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)
        const tipsMonth = monthTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)

        // Estimate commission at 50% of sales
        const todaySales = todayTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0)
        const weekSales = weekTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0)
        const monthSales = monthTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0)

        const commissionToday = todaySales * 0.5
        const commissionWeek = weekSales * 0.5
        const commissionMonth = monthSales * 0.5

        const servicesCompleted = todayAppointments.filter(a =>
            a.status === 'COMPLETED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS'
        ).length

        const uniqueClients = new Set(todayAppointments.filter(a => a.clientId).map(a => a.clientId)).size

        const avgTicket = todayTransactions.length > 0 ? todaySales / todayTransactions.length : 0

        // Simplified hours worked (8 hours default if any transactions)
        const hoursWorked = todayTransactions.length > 0 ? 8 : 0

        // Simplified return rate
        const returnRate = 65 // Default 65% return rate

        return NextResponse.json({
            tipsToday,
            tipsWeek,
            tipsMonth,
            commissionToday,
            commissionWeek,
            commissionMonth,
            servicesCompleted,
            clientsServed: uniqueClients,
            avgTicket: Math.round(avgTicket * 100) / 100,
            returnRate,
            hoursWorked
        })
    } catch (error) {
        console.error('Error fetching employee reports:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}
