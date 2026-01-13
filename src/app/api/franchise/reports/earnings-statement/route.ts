import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Barber/Stylist Earnings Statement
// Shows detailed breakdown of earnings per barber for a date range
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return ApiResponse.notFound('User')
        }

        const searchParams = request.nextUrl.searchParams
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const employeeId = searchParams.get('employeeId')

        // Default to current week
        const now = new Date()
        const defaultStart = new Date(now)
        defaultStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        defaultStart.setHours(0, 0, 0, 0)

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
            return ApiResponse.error('Franchise not found', 404)
        }

        // Build employee filter
        const employeeFilter: any = {
            franchiseId,
            role: 'EMPLOYEE'
        }

        if (employeeId) {
            employeeFilter.id = employeeId
        }

        // Get all employees (barbers/stylists)
        const employees = await prisma.user.findMany({
            where: employeeFilter,
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        // Get earnings data for each employee
        const earningsStatements = await Promise.all(
            employees.map(async (employee) => {
                // Get transactions where employee was the cashier or service provider
                const transactions = await prisma.transaction.findMany({
                    where: {
                        franchiseId,
                        createdAt: {
                            gte: dateStart,
                            lte: dateEnd
                        },
                        OR: [
                            { employeeId: employee.id },
                            { lineItems: { some: { staffId: employee.id } } }
                        ]
                    },
                    include: {
                        lineItems: {
                            where: { staffId: employee.id },
                            include: {
                                service: { select: { name: true } },
                                product: { select: { name: true } }
                            }
                        }
                    }
                })

                // Calculate services performed
                const servicesPerformed: Array<{
                    name: string
                    quantity: number
                    price: number
                    total: number
                    commission: number
                }> = []

                let totalServiceRevenue = 0
                let totalProductRevenue = 0
                let totalTips = 0
                let cashTips = 0
                let cardTips = 0

                transactions.forEach(tx => {
                    // Sum tips
                    const tipAmount = Number(tx.tip || 0)
                    totalTips += tipAmount

                    if (tx.paymentMethod === 'CASH') {
                        cashTips += tipAmount
                    } else {
                        cardTips += tipAmount
                    }

                    // Sum line items for this employee
                    tx.lineItems.forEach(item => {
                        const itemTotal = Number(item.total)

                        if (item.type === 'SERVICE') {
                            totalServiceRevenue += itemTotal

                            const serviceName = item.service?.name || 'Service'
                            const existing = servicesPerformed.find(s => s.name === serviceName)

                            if (existing) {
                                existing.quantity += item.quantity
                                existing.total += itemTotal
                            } else {
                                servicesPerformed.push({
                                    name: serviceName,
                                    quantity: item.quantity,
                                    price: Number(item.price),
                                    total: itemTotal,
                                    commission: 0 // Will calculate based on compensation plan
                                })
                            }
                        } else {
                            totalProductRevenue += itemTotal
                        }
                    })
                })

                // Get employee's compensation plan
                const compensationPlan = await prisma.compensationPlan.findFirst({
                    where: { userId: employee.id },
                    orderBy: { createdAt: 'desc' }
                })

                // Calculate commission based on compensation type
                let totalCommission = 0
                let compensationType = 'HOURLY' // default

                if (compensationPlan) {
                    compensationType = compensationPlan.type

                    if (compensationPlan.type === 'COMMISSION') {
                        const rate = Number(compensationPlan.commissionRate || 0) / 100
                        totalCommission = totalServiceRevenue * rate

                        // Update service items with commission
                        servicesPerformed.forEach(service => {
                            service.commission = service.total * rate
                        })
                    } else if (compensationPlan.type === 'HOURLY') {
                        // For hourly, commission is just tips
                        totalCommission = 0
                    } else if (compensationPlan.type === 'SALARY') {
                        // For salary, no service commission
                        totalCommission = 0
                    } else if (compensationPlan.type === 'CHAIR_RENTAL') {
                        // Chair rental: they keep service revenue minus rent
                        const chairRent = Number(compensationPlan.chairRentAmount || 0)
                        totalCommission = totalServiceRevenue // They keep all service revenue
                    }
                }

                // Get refunds related to this employee
                const refunds = await prisma.transaction.findMany({
                    where: {
                        franchiseId,
                        status: 'REFUNDED',
                        createdAt: {
                            gte: dateStart,
                            lte: dateEnd
                        },
                        OR: [
                            { employeeId: employee.id },
                            { lineItems: { some: { staffId: employee.id } } }
                        ]
                    },
                    select: {
                        total: true
                    }
                })

                const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.total), 0)

                // Calculate net earnings
                const netEarnings = totalCommission + totalTips - totalRefunds

                return {
                    employee: {
                        id: employee.id,
                        name: employee.name,
                        email: employee.email
                    },
                    dateRange: {
                        start: dateStart.toISOString(),
                        end: dateEnd.toISOString()
                    },
                    compensationType,
                    summary: {
                        totalTransactions: transactions.length,
                        serviceRevenue: totalServiceRevenue,
                        productRevenue: totalProductRevenue,
                        totalRevenue: totalServiceRevenue + totalProductRevenue,
                        commission: totalCommission,
                        tips: {
                            total: totalTips,
                            cash: cashTips,
                            card: cardTips
                        },
                        refundReversals: totalRefunds,
                        netEarnings
                    },
                    servicesPerformed,
                    transactions: transactions.map(tx => ({
                        id: tx.id,
                        date: tx.createdAt,
                        total: Number(tx.total),
                        tip: Number(tx.tip || 0),
                        paymentMethod: tx.paymentMethod,
                        status: tx.status,
                        itemCount: tx.lineItems.length
                    }))
                }
            })
        )

        return ApiResponse.success({
            data: earningsStatements,
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating earnings statement:', error)
        return ApiResponse.serverError('Failed to generate earnings statement')
    }
}
