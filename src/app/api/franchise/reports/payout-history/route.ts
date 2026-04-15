import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prismaReadonly as prisma } from '@/lib/prisma-readonly'
// GET: Payout History Report
// Shows all payouts made to barbers/stylists
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!user) {
            return NextResponse.json({ error: 'User' }, { status: 404 })
        }

        const searchParams = req.nextUrl.searchParams
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const employeeId = searchParams.get('employeeId')
        const status = searchParams.get('status') // 'paid', 'pending', 'all'

        // Default to last 30 days
        const now = new Date()
        const defaultStart = new Date(now)
        defaultStart.setDate(now.getDate() - 30)

        const dateStart = startDate ? new Date(startDate) : defaultStart
        const dateEnd = endDate ? new Date(endDate) : now

        // Get franchise ID
        let franchiseId = user.franchiseId

        if (user.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Build filter for employees
        const employeeFilter: any = {
            franchiseId,
            role: 'EMPLOYEE'
        }

        if (employeeId) {
            employeeFilter.id = employeeId
        }

        // Get all employees
        const employees = await prisma.user.findMany({
            where: employeeFilter,
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        // Calculate payouts for each employee based on transactions
        const payouts = await Promise.all(
            employees.map(async (employee) => {
                // Get compensation plan (not in main schema — any-cast)
                const compensationPlan = await prisma.compensationPlan.findFirst({
                    where: { userId: employee.id },
                    orderBy: { createdAt: 'desc' }
                })

                // Get transactions for this employee in date range
                const transactions = await prisma.transaction.findMany({
                    where: {
                        franchiseId,
                        status: 'COMPLETED',
                        createdAt: {
                            gte: dateStart,
                            lte: dateEnd
                        }
                    },
                    include: {
                        lineItems: true
                    }
                })

                // Calculate earnings
                let serviceRevenue = 0
                let totalTips = 0
                let cashTips = 0
                let cardTips = 0

                transactions.forEach(tx => {
                    const tipAmount = Number(tx.tip || 0)
                    totalTips += tipAmount

                    if (tx.paymentMethod === 'CASH') {
                        cashTips += tipAmount
                    } else {
                        cardTips += tipAmount
                    }

                    tx.lineItems.forEach((item: any) => {
                        if (item.type === 'SERVICE') {
                            serviceRevenue += Number(item.total)
                        }
                    })
                })

                // Calculate commission based on compensation type
                let commission = 0
                let chairRent = 0
                let compensationType = 'HOURLY'

                if (compensationPlan) {
                    compensationType = compensationPlan.type

                    if (compensationPlan.type === 'COMMISSION') {
                        const rate = Number(compensationPlan.commissionRate || 0) / 100
                        commission = serviceRevenue * rate
                    } else if (compensationPlan.type === 'CHAIR_RENTAL') {
                        chairRent = Number(compensationPlan.chairRentAmount || 0)
                        commission = serviceRevenue // They keep service revenue
                    }
                }

                const totalPayout = commission + totalTips - chairRent

                // Create payout records (simulated - in real system would be from a Payouts table)
                return {
                    id: `payout-${employee.id}-${dateStart.getTime()}`,
                    employee: {
                        id: employee.id,
                        name: employee.name,
                        email: employee.email
                    },
                    period: {
                        start: dateStart.toISOString(),
                        end: dateEnd.toISOString()
                    },
                    compensationType,
                    breakdown: {
                        serviceRevenue,
                        commission,
                        tips: {
                            total: totalTips,
                            cash: cashTips,
                            card: cardTips
                        },
                        chairRent,
                        adjustments: 0
                    },
                    totalPayout,
                    status: 'pending', // Could be 'paid' if we track actual payouts
                    transactionCount: transactions.length,
                    lastUpdated: new Date().toISOString()
                }
            })
        )

        // Calculate totals
        const totalCommissions = payouts.reduce((sum, p) => sum + p.breakdown.commission, 0)
        const totalTips = payouts.reduce((sum, p) => sum + p.breakdown.tips.total, 0)
        const totalPayouts = payouts.reduce((sum, p) => sum + p.totalPayout, 0)
        const totalChairRent = payouts.reduce((sum, p) => sum + p.breakdown.chairRent, 0)

        return NextResponse.json({
            data: payouts,
            summary: {
                totalEmployees: payouts.length,
                totalCommissions,
                totalTips,
                totalChairRent,
                totalPayouts
            },
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating payout history:', error)
        return NextResponse.json({ error: 'Failed to generate payout history' }, { status: 500 })
    }
}
