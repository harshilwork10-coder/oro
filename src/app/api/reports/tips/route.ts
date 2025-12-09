import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Tips report by employee and date range
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { searchParams } = new URL(request.url)

        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const employeeId = searchParams.get('employeeId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Build date filter
        const dateFilter: any = {}
        if (startDate) {
            dateFilter.gte = new Date(startDate)
        }
        if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            dateFilter.lte = end
        }

        // Get transactions with tips
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                tip: { gt: 0 },
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                ...(employeeId && { employeeId })
            },
            select: {
                id: true,
                tip: true,
                total: true,
                createdAt: true,
                employeeId: true,
                employee: {
                    select: { id: true, name: true, email: true }
                },
                client: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Aggregate by employee
        const tipsByEmployee: Record<string, {
            employeeId: string,
            employeeName: string,
            totalTips: number,
            transactionCount: number,
            averageTip: number
        }> = {}

        let grandTotal = 0

        for (const tx of transactions) {
            const tipAmount = Number(tx.tip)
            grandTotal += tipAmount

            if (tx.employeeId) {
                if (!tipsByEmployee[tx.employeeId]) {
                    tipsByEmployee[tx.employeeId] = {
                        employeeId: tx.employeeId,
                        employeeName: tx.employee?.name || tx.employee?.email || 'Unknown',
                        totalTips: 0,
                        transactionCount: 0,
                        averageTip: 0
                    }
                }
                tipsByEmployee[tx.employeeId].totalTips += tipAmount
                tipsByEmployee[tx.employeeId].transactionCount++
            }
        }

        // Calculate averages
        Object.values(tipsByEmployee).forEach(emp => {
            emp.averageTip = emp.transactionCount > 0
                ? emp.totalTips / emp.transactionCount
                : 0
        })

        return NextResponse.json({
            summary: {
                totalTips: grandTotal,
                transactionCount: transactions.length,
                averageTip: transactions.length > 0 ? grandTotal / transactions.length : 0
            },
            byEmployee: Object.values(tipsByEmployee).sort((a, b) => b.totalTips - a.totalTips),
            transactions: transactions.slice(0, 100) // Limit to last 100
        })
    } catch (error) {
        console.error('Error fetching tips report:', error)
        return NextResponse.json({ error: 'Failed to fetch tips report' }, { status: 500 })
    }
}
