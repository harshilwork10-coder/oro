import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Multi-store performance comparison dashboard data
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // PROVIDER can see all locations, others need franchiseId
        let locationFilter: any = {}

        if (user.role === 'PROVIDER') {
            // Provider sees ALL locations across all franchises
            locationFilter = {}
        } else if (user.franchiseId) {
            locationFilter = { franchiseId: user.franchiseId }
        } else {
            // No franchise and not provider - return empty
            return NextResponse.json({
                locations: [],
                summary: {
                    totalLocations: 0,
                    todaySales: 0,
                    todayTransactions: 0,
                    mtdSales: 0,
                    lowStockTotal: 0,
                    topLocation: null
                }
            })
        }

        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: {
                id: true,
                name: true,
                address: true,
                franchiseId: true
            }
        })

        if (locations.length === 0) {
            return NextResponse.json({ locations: [], summary: null })
        }

        // Get today's date range
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        // Get start of month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        // Fetch performance data for each location
        const locationData = await Promise.all(
            locations.map(async (location) => {
                // Today's transactions
                const todayTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfDay, lte: endOfDay },
                        status: 'COMPLETED'
                    },
                    select: { total: true, paymentMethod: true }
                })

                // MTD transactions
                const mtdTransactions = await prisma.transaction.findMany({
                    where: {
                        cashDrawerSession: { locationId: location.id },
                        createdAt: { gte: startOfMonth },
                        status: 'COMPLETED'
                    },
                    select: { total: true }
                })

                // Product count for this location's franchise
                const productCount = location.franchiseId ? await prisma.product.count({
                    where: { franchiseId: location.franchiseId, isActive: true }
                }) : 0

                // Low stock items
                const lowStockItems = location.franchiseId ? await prisma.product.count({
                    where: {
                        franchiseId: location.franchiseId,
                        isActive: true,
                        stock: { lte: 5 }
                    }
                }) : 0

                // Active employees at this location
                const employeeCount = await prisma.user.count({
                    where: { locationId: location.id }
                })

                // Calculate metrics
                const todaySales = todayTransactions.reduce((sum, t) => sum + Number(t.total), 0)
                const todayCash = todayTransactions.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + Number(t.total), 0)
                const todayCard = todayTransactions.filter(t => t.paymentMethod === 'CARD').reduce((sum, t) => sum + Number(t.total), 0)
                const mtdSales = mtdTransactions.reduce((sum, t) => sum + Number(t.total), 0)
                const avgTicket = todayTransactions.length > 0 ? todaySales / todayTransactions.length : 0

                return {
                    location: {
                        id: location.id,
                        name: location.name,
                        address: location.address
                    },
                    today: {
                        sales: todaySales,
                        transactions: todayTransactions.length,
                        cash: todayCash,
                        card: todayCard,
                        avgTicket
                    },
                    mtd: {
                        sales: mtdSales,
                        transactions: mtdTransactions.length
                    },
                    inventory: {
                        totalProducts: productCount,
                        lowStock: lowStockItems
                    },
                    staff: {
                        count: employeeCount
                    }
                }
            })
        )

        // Calculate totals across all locations
        const summary = {
            totalLocations: locations.length,
            todaySales: locationData.reduce((sum, l) => sum + l.today.sales, 0),
            todayTransactions: locationData.reduce((sum, l) => sum + l.today.transactions, 0),
            mtdSales: locationData.reduce((sum, l) => sum + l.mtd.sales, 0),
            lowStockTotal: locationData.reduce((sum, l) => sum + l.inventory.lowStock, 0),
            topLocation: locationData.length > 0
                ? locationData.reduce((prev, curr) => prev.today.sales > curr.today.sales ? prev : curr).location.name
                : null
        }

        return NextResponse.json({
            locations: locationData,
            summary
        })

    } catch (error) {
        console.error('[MULTI_STORE_DASHBOARD]', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}

