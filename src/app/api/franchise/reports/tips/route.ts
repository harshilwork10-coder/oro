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
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const locationId = searchParams.get('locationId')

    // Default to today if no dates
    const now = new Date()
    let startOfDay = new Date(now)
    let endOfDay = new Date(now)

    if (startDateParam && endDateParam) {
        startOfDay = new Date(startDateParam)
        endOfDay = new Date(endDateParam)
    }
    startOfDay.setHours(0, 0, 0, 0)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        const whereClause: any = {
            franchiseId: user.franchiseId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'COMPLETED',
            tip: { gt: 0 }
        }
        if (locationId) whereClause.locationId = locationId

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: { employee: true }
        })

        // Aggregate tips by employee
        const employeeTips: Record<string, { name: string; tips: number; transactions: number }> = {}
        let totalTips = 0

        transactions.forEach((tx: any) => {
            const tip = Number(tx.tip) || 0
            totalTips += tip
            if (tx.employee) {
                const empId = tx.employee.id
                if (!employeeTips[empId]) {
                    employeeTips[empId] = { name: tx.employee.name || 'Unknown', tips: 0, transactions: 0 }
                }
                employeeTips[empId].tips += tip
                employeeTips[empId].transactions += 1
            }
        })

        const employees = Object.values(employeeTips).sort((a, b) => b.tips - a.tips)
        const totalSales = transactions.reduce((sum, tx: any) => sum + Number(tx.total), 0)
        const tipPercent = totalSales > 0 ? (totalTips / totalSales) * 100 : 0

        return NextResponse.json({
            totalTips,
            tipPercent: Number(tipPercent.toFixed(1)),
            employees
        })

    } catch (error) {
        console.error('Error generating tips report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
