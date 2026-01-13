import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

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
                total: true,
                commission: true
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
                commission: true
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
                commission: true
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
                clientId: true,
                service: {
                    select: { durationMinutes: true }
                }
            }
        })

        // Get time clock data for hours worked today
        const todayShifts = await prisma.shift.findMany({
            where: {
                userId: userId,
                clockIn: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            select: {
                clockIn: true,
                clockOut: true
            }
        })

        // Calculate metrics
        const tipsToday = todayTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)
        const tipsWeek = weekTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)
        const tipsMonth = monthTransactions.reduce((sum, t) => sum + (Number(t.tip) || 0), 0)

        const commissionToday = todayTransactions.reduce((sum, t) => sum + (Number(t.commission) || 0), 0)
        const commissionWeek = weekTransactions.reduce((sum, t) => sum + (Number(t.commission) || 0), 0)
        const commissionMonth = monthTransactions.reduce((sum, t) => sum + (Number(t.commission) || 0), 0)

        const servicesCompleted = todayAppointments.filter(a =>
            a.status === 'COMPLETED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS'
        ).length

        const uniqueClients = new Set(todayAppointments.map(a => a.clientId)).size

        const totalSales = todayTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0)
        const avgTicket = todayTransactions.length > 0 ? totalSales / todayTransactions.length : 0

        // Calculate hours worked from shifts
        let hoursWorked = 0
        for (const shift of todayShifts) {
            const clockOut = shift.clockOut || new Date()
            const diff = (clockOut.getTime() - shift.clockIn.getTime()) / (1000 * 60 * 60)
            hoursWorked += diff
        }

        // Client retention - simplified: count returning clients in last 30 days
        const monthClients = await prisma.appointment.groupBy({
            by: ['clientId'],
            where: {
                employeeId: userId,
                startTime: {
                    gte: monthStart,
                    lte: todayEnd
                },
                clientId: { not: null }
            },
            _count: { clientId: true }
        })

        const returningClients = monthClients.filter(c => c._count.clientId > 1).length
        const returnRate = monthClients.length > 0
            ? Math.round((returningClients / monthClients.length) * 100)
            : 0

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
            hoursWorked: Math.round(hoursWorked * 10) / 10
        })
    } catch (error) {
        console.error('Error fetching employee reports:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}
