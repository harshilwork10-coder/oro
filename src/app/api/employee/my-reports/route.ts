import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch employee's personal performance reports
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const employeeId = user.employeeId || user.id
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // Get transaction count and totals for current month
        const transactions = await prisma.transaction.aggregate({
            where: {
                employeeId,
                status: 'COMPLETED',
                createdAt: { gte: startOfMonth }
            },
            _count: true,
            _sum: { total: true, tipAmount: true }
        })

        return NextResponse.json({
            period: {
                start: startOfMonth.toISOString(),
                end: now.toISOString()
            },
            totalTransactions: transactions._count || 0,
            totalRevenue: Number(transactions._sum?.total || 0),
            totalTips: Number(transactions._sum?.tipAmount || 0)
        })
    } catch (error) {
        console.error('[EMPLOYEE_MY_REPORTS]', error)
        return NextResponse.json({
            period: {},
            totalTransactions: 0,
            totalRevenue: 0,
            totalTips: 0
        })
    }
}
