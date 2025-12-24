import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Store comparison data for charts
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '7')
        const metric = searchParams.get('metric') || 'sales' // sales, transactions, avgTicket

        // Get locations
        let locationFilter: any = {}
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            locationFilter.franchiseId = user.franchiseId
        }

        const locations = await prisma.location.findMany({
            where: locationFilter,
            select: { id: true, name: true, franchiseId: true }
        })

        if (locations.length === 0) {
            return NextResponse.json({ locations: [], dailyData: [], summary: {} })
        }

        // Date range
        const now = new Date()
        const endDate = new Date(now)
        endDate.setHours(23, 59, 59, 999)

        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days + 1)
        startDate.setHours(0, 0, 0, 0)

        // Get all transactions in range
        const transactions = await prisma.transaction.findMany({
            where: {
                cashDrawerSession: { locationId: { in: locations.map(l => l.id) } },
                createdAt: { gte: startDate, lte: endDate },
                status: 'COMPLETED'
            },
            select: {
                id: true,
                total: true,
                createdAt: true,
                cashDrawerSession: {
                    select: { locationId: true }
                }
            }
        })

        // Build daily data per location
        const dailyData: any[] = []
        const locationTotals = new Map<string, { sales: number, transactions: number }>()

        // Initialize location totals
        locations.forEach(loc => {
            locationTotals.set(loc.id, { sales: 0, transactions: 0 })
        })

        // Group by date
        for (let d = 0; d < days; d++) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + d)
            const dateStr = date.toISOString().split('T')[0]

            const dayData: any = { date: dateStr }

            locations.forEach(loc => {
                const dayTx = transactions.filter(tx => {
                    const txDate = tx.createdAt.toISOString().split('T')[0]
                    return txDate === dateStr && tx.cashDrawerSession?.locationId === loc.id
                })

                const sales = dayTx.reduce((sum, tx) => sum + Number(tx.total), 0)
                const txCount = dayTx.length
                const avgTicket = txCount > 0 ? sales / txCount : 0

                dayData[loc.name] = metric === 'sales' ? sales :
                    metric === 'transactions' ? txCount :
                        avgTicket

                // Accumulate totals
                const totals = locationTotals.get(loc.id)!
                totals.sales += sales
                totals.transactions += txCount
            })

            dailyData.push(dayData)
        }

        // Calculate rankings
        const rankings = locations.map(loc => {
            const totals = locationTotals.get(loc.id)!
            return {
                id: loc.id,
                name: loc.name,
                totalSales: totals.sales,
                totalTransactions: totals.transactions,
                avgTicket: totals.transactions > 0 ? totals.sales / totals.transactions : 0,
                avgDaily: totals.sales / days
            }
        }).sort((a, b) => b.totalSales - a.totalSales)

        // Summary
        const totalSales = rankings.reduce((sum, r) => sum + r.totalSales, 0)
        const totalTx = rankings.reduce((sum, r) => sum + r.totalTransactions, 0)

        return NextResponse.json({
            locations: locations.map(l => l.name),
            dailyData,
            rankings,
            summary: {
                totalSales,
                totalTransactions: totalTx,
                avgTicket: totalTx > 0 ? totalSales / totalTx : 0,
                topStore: rankings[0]?.name || null,
                bottomStore: rankings[rankings.length - 1]?.name || null
            },
            dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0], days }
        })

    } catch (error) {
        console.error('Store comparison error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
