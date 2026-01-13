import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Discount & Override Audit Report
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
            return ApiResponse.error('Franchise not found', 404)
        }

        // Get all transactions with discounts
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                },
                discount: { gt: 0 }
            },
            include: {
                employee: { select: { id: true, name: true } },
                lineItems: {
                    include: {
                        staff: { select: { id: true, name: true } },
                        service: { select: { name: true, price: true } },
                        product: { select: { name: true, price: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Calculate statistics
        let totalDiscountAmount = 0
        let totalTransactionsWithDiscount = transactions.length

        // By barber breakdown
        const byBarber: Record<string, {
            id: string
            name: string
            discountCount: number
            totalDiscountAmount: number
            avgDiscount: number
            transactions: number
        }> = {}

        // By discount range
        const byDiscountRange: Record<string, number> = {
            '1-10%': 0,
            '11-25%': 0,
            '26-50%': 0,
            '51-75%': 0,
            '76-100%': 0
        }

        // Suspicious discounts (high value or 100%)
        const suspiciousDiscounts: Array<{
            transactionId: string
            date: string
            barber: string
            originalAmount: number
            discountAmount: number
            discountPercent: number
            finalAmount: number
        }> = []

        transactions.forEach(tx => {
            const discountAmount = Number(tx.discount || 0)
            const subtotal = Number(tx.subtotal || 0)
            const discountPercent = subtotal > 0 ? (discountAmount / (subtotal + discountAmount)) * 100 : 0

            totalDiscountAmount += discountAmount

            // Categorize by range
            if (discountPercent <= 10) byDiscountRange['1-10%']++
            else if (discountPercent <= 25) byDiscountRange['11-25%']++
            else if (discountPercent <= 50) byDiscountRange['26-50%']++
            else if (discountPercent <= 75) byDiscountRange['51-75%']++
            else byDiscountRange['76-100%']++

            // Track suspicious (50%+ discount or > $50)
            if (discountPercent >= 50 || discountAmount >= 50) {
                suspiciousDiscounts.push({
                    transactionId: tx.id,
                    date: tx.createdAt.toISOString(),
                    barber: tx.employee?.name || 'Unknown',
                    originalAmount: subtotal + discountAmount,
                    discountAmount,
                    discountPercent,
                    finalAmount: subtotal
                })
            }

            // By barber (cashier)
            if (tx.employee) {
                if (!byBarber[tx.employee.id]) {
                    byBarber[tx.employee.id] = {
                        id: tx.employee.id,
                        name: tx.employee.name || 'Unknown',
                        discountCount: 0,
                        totalDiscountAmount: 0,
                        avgDiscount: 0,
                        transactions: 0
                    }
                }
                byBarber[tx.employee.id].discountCount++
                byBarber[tx.employee.id].totalDiscountAmount += discountAmount
                byBarber[tx.employee.id].transactions++
            }
        })

        // Calculate average discount per barber
        Object.values(byBarber).forEach(barber => {
            barber.avgDiscount = barber.discountCount > 0
                ? barber.totalDiscountAmount / barber.discountCount
                : 0
        })

        // Get total transactions for comparison
        const totalTransactions = await prisma.transaction.count({
            where: {
                franchiseId,
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            }
        })

        const discountRate = totalTransactions > 0
            ? (totalTransactionsWithDiscount / totalTransactions) * 100
            : 0

        return ApiResponse.success({
            summary: {
                totalTransactions,
                transactionsWithDiscount: totalTransactionsWithDiscount,
                discountRate,
                totalDiscountAmount,
                avgDiscountPerTransaction: totalTransactionsWithDiscount > 0
                    ? totalDiscountAmount / totalTransactionsWithDiscount
                    : 0
            },
            byBarber: Object.values(byBarber).sort((a, b) =>
                b.totalDiscountAmount - a.totalDiscountAmount
            ),
            byDiscountRange,
            suspiciousDiscounts: suspiciousDiscounts.slice(0, 20),
            recentDiscounts: transactions.slice(0, 20).map(tx => ({
                id: tx.id,
                date: tx.createdAt,
                barber: tx.employee?.name || 'Unknown',
                subtotal: Number(tx.subtotal),
                discount: Number(tx.discount),
                total: Number(tx.total),
                items: tx.lineItems.map(li => li.service?.name || li.product?.name || 'Item')
            })),
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString()
            },
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error generating discount audit:', error)
        return ApiResponse.serverError('Failed to generate discount audit')
    }
}
