import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        // Fetch transactions processed by this employee this month
        const transactions = await prisma.transaction.findMany({
            where: {
                employeeId: user.id,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                status: 'COMPLETED'
            }
        })

        const totalSales = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
        const totalTips = transactions.reduce((sum, tx) => sum + Number(tx.tip), 0)
        const transactionCount = transactions.length

        // Calculate hours worked (from completed schedules)
        // Note: This assumes schedules are accurate records of time worked. 
        // In a real system, we'd use a separate TimeEntry model.
        const completedSchedules = await prisma.schedule.findMany({
            where: {
                employeeId: user.id,
                endTime: {
                    gte: startOfMonth,
                    lte: now // Only count past shifts
                }
            }
        })

        const hoursWorked = completedSchedules.reduce((sum, shift) => {
            const duration = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()
            return sum + (duration / (1000 * 60 * 60))
        }, 0)

        return NextResponse.json({
            totalSales,
            totalTips,
            transactionCount,
            hoursWorked
        })
    } catch (error) {
        console.error('Error fetching employee stats:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
