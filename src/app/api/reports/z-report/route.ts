import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const dateParam = searchParams.get('date')
        const date = dateParam ? new Date(dateParam) : new Date()

        // Set date range for the selected day
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        // Get user's location/franchise for filtering
        const userId = session.user.id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true, franchiseId: true, role: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Build query filters based on user role
        const whereClause: any = {
            createdAt: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: 'COMPLETED'
        }

        // Filter by location for employees/managers, by franchise for franchisees
        if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
            if (user.locationId) {
                whereClause.cashDrawerSession = {
                    locationId: user.locationId
                }
            }
        } else if (user.role === 'FRANCHISEE') {
            if (user.franchiseId) {
                whereClause.cashDrawerSession = {
                    location: {
                        franchiseId: user.franchiseId
                    }
                }
            }
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                lineItems: {
                    include: {
                        service: true,
                        product: true
                    }
                },
                cashDrawerSession: true
            },
            orderBy: { createdAt: 'asc' }
        })

        // Calculate summary
        const totalSales = transactions.reduce((sum, tx) => sum + tx.total, 0)
        const cashTransactions = transactions.filter(tx => tx.paymentMethod === 'CASH')
        const cardTransactions = transactions.filter(tx => tx.paymentMethod === 'CARD')

        const cashSales = cashTransactions.reduce((sum, tx) => sum + tx.total, 0)
        const cardSales = cardTransactions.reduce((sum, tx) => sum + tx.total, 0)

        // Get cash drawer info for the day
        const cashDrawerSessions = await prisma.cashDrawerSession.findMany({
            where: {
                openedAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                ...(user.locationId ? { locationId: user.locationId } : {})
            },
            orderBy: { openedAt: 'desc' }
        })

        const latestSession = cashDrawerSessions[0]
        const openingCash = latestSession?.openingAmount || 0
        const closingCash = latestSession?.closingAmount || null

        // Top selling items
        const itemMap = new Map()
        transactions.forEach(tx => {
            tx.lineItems.forEach((lineItem: any) => {
                const name = lineItem.service?.name || lineItem.product?.name || 'Unknown Item'
                const existing = itemMap.get(name) || { name, quantity: 0, sales: 0 }
                existing.quantity += lineItem.quantity
                existing.sales += lineItem.total
                itemMap.set(name, existing)
            })
        })

        const topItems = Array.from(itemMap.values())
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10)

        // Tax calculation
        const subtotal = transactions.reduce((sum, tx) => sum + tx.subtotal, 0)
        const tax = transactions.reduce((sum, tx) => sum + tx.tax, 0)

        const reportData = {
            summary: {
                totalSales,
                cashSales,
                cardSales,
                cashCount: cashTransactions.length,
                cardCount: cardTransactions.length,
                totalTransactions: transactions.length
            },
            cashReconciliation: {
                opening: openingCash,
                sales: cashSales,
                expected: openingCash + cashSales,
                actual: closingCash,
                variance: closingCash !== null ? closingCash - (openingCash + cashSales) : 0
            },
            topItems,
            taxSummary: {
                subtotal,
                tax,
                total: subtotal + tax
            }
        }

        return NextResponse.json(reportData)
    } catch (error) {
        console.error('Error generating Z Report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
