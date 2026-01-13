import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Cash vs Card Breakdown Report
// Critical for detecting cash leakage in barbershops
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

        // Default to last 7 days
        const now = new Date()
        const defaultStart = new Date(now)
        defaultStart.setDate(now.getDate() - 7)

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

        // Get all completed transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: { in: ['COMPLETED', 'REFUNDED'] },
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            include: {
                employee: { select: { id: true, name: true } },
                lineItems: {
                    include: {
                        staff: { select: { id: true, name: true } }
                    }
                }
            }
        })

        // Overall totals
        let totalCashRevenue = 0
        let totalCardRevenue = 0
        let totalCashTips = 0
        let totalCardTips = 0
        let cashTransactionCount = 0
        let cardTransactionCount = 0

        // By barber breakdown
        const byBarber: Record<string, {
            id: string
            name: string
            cashRevenue: number
            cardRevenue: number
            cashTips: number
            cardTips: number
            cashCount: number
            cardCount: number
        }> = {}

        // By day breakdown
        const byDay: Record<string, {
            date: string
            cashRevenue: number
            cardRevenue: number
            cashTips: number
            cardTips: number
        }> = {}

        transactions.forEach(tx => {
            const isCash = tx.paymentMethod === 'CASH'
            const total = Number(tx.total)
            const tip = Number(tx.tip || 0)
            const dateKey = new Date(tx.createdAt).toISOString().split('T')[0]

            // Overall totals
            if (isCash) {
                totalCashRevenue += total
                totalCashTips += tip
                cashTransactionCount++
            } else {
                totalCardRevenue += total
                totalCardTips += tip
                cardTransactionCount++
            }

            // By day
            if (!byDay[dateKey]) {
                byDay[dateKey] = {
                    date: dateKey,
                    cashRevenue: 0,
                    cardRevenue: 0,
                    cashTips: 0,
                    cardTips: 0
                }
            }
            if (isCash) {
                byDay[dateKey].cashRevenue += total
                byDay[dateKey].cashTips += tip
            } else {
                byDay[dateKey].cardRevenue += total
                byDay[dateKey].cardTips += tip
            }

            // By barber - get from line items staff or transaction employee
            const staffIds = new Set<string>()
            tx.lineItems.forEach(item => {
                if (item.staff) {
                    staffIds.add(item.staff.id)
                    if (!byBarber[item.staff.id]) {
                        byBarber[item.staff.id] = {
                            id: item.staff.id,
                            name: item.staff.name || 'Unknown',
                            cashRevenue: 0,
                            cardRevenue: 0,
                            cashTips: 0,
                            cardTips: 0,
                            cashCount: 0,
                            cardCount: 0
                        }
                    }

                    const itemTotal = Number(item.total)
                    if (isCash) {
                        byBarber[item.staff.id].cashRevenue += itemTotal
                    } else {
                        byBarber[item.staff.id].cardRevenue += itemTotal
                    }
                }
            })

            // Add tips to first staff member (or cashier if no staff)
            if (staffIds.size > 0) {
                const firstStaffId = Array.from(staffIds)[0]
                if (isCash) {
                    byBarber[firstStaffId].cashTips += tip
                    byBarber[firstStaffId].cashCount++
                } else {
                    byBarber[firstStaffId].cardTips += tip
                    byBarber[firstStaffId].cardCount++
                }
            }
        })

        // Calculate percentages
        const totalRevenue = totalCashRevenue + totalCardRevenue
        const totalTips = totalCashTips + totalCardTips
        const cashRevenuePercent = totalRevenue > 0 ? (totalCashRevenue / totalRevenue) * 100 : 0
        const cardRevenuePercent = totalRevenue > 0 ? (totalCardRevenue / totalRevenue) * 100 : 0
        const cashTipsPercent = totalTips > 0 ? (totalCashTips / totalTips) * 100 : 0
        const cardTipsPercent = totalTips > 0 ? (totalCardTips / totalTips) * 100 : 0

        return ApiResponse.success({
            summary: {
                totalRevenue,
                cash: {
                    revenue: totalCashRevenue,
                    revenuePercent: cashRevenuePercent,
                    tips: totalCashTips,
                    tipsPercent: cashTipsPercent,
                    transactionCount: cashTransactionCount
                },
                card: {
                    revenue: totalCardRevenue,
                    revenuePercent: cardRevenuePercent,
                    tips: totalCardTips,
                    tipsPercent: cardTipsPercent,
                    transactionCount: cardTransactionCount
                },
                totalTips
            },
            byBarber: Object.values(byBarber).sort((a, b) =>
                (b.cashRevenue + b.cardRevenue) - (a.cashRevenue + a.cardRevenue)
            ),
            byDay: Object.values(byDay).sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating cash vs card report:', error)
        return ApiResponse.serverError('Failed to generate cash vs card report')
    }
}
