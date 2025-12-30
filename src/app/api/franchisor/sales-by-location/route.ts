import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Sales by Location Report for Franchisor
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || !['OWNER', 'FRANCHISOR', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'today' // today, week, month, year
        const franchiseId = user.franchiseId

        // Calculate date range
        const now = new Date()
        let startDate: Date

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                break
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }

        // Get all locations for this franchise
        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: { id: true, name: true, address: true }
        })

        // Get transactions grouped by location
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: startDate },
                status: 'COMPLETED',
                ...(franchiseId ? { franchiseId } : {})
            },
            include: {
                cashDrawerSession: {
                    select: { locationId: true }
                }
            }
        })

        // Aggregate by location
        const locationData: Record<string, {
            locationId: string
            locationName: string
            totalSales: number
            cashSales: number
            cardSales: number
            transactionCount: number
            avgTicket: number
            taxCollected: number
            tipsCollected: number
        }> = {}

        // Initialize all locations
        for (const loc of locations) {
            locationData[loc.id] = {
                locationId: loc.id,
                locationName: loc.name,
                totalSales: 0,
                cashSales: 0,
                cardSales: 0,
                transactionCount: 0,
                avgTicket: 0,
                taxCollected: 0,
                tipsCollected: 0
            }
        }

        // Process transactions
        for (const tx of transactions) {
            const locId = tx.cashDrawerSession?.locationId
            if (!locId) continue

            const loc = locationData[locId]
            if (!loc) continue

            const total = Number(tx.total)
            const tax = Number(tx.tax)
            const tip = Number(tx.tipAmount || 0)
            const paymentMethod = tx.paymentMethod || 'CASH'

            loc.totalSales += total
            loc.transactionCount++
            loc.taxCollected += tax
            loc.tipsCollected += tip

            if (paymentMethod === 'CASH') {
                loc.cashSales += total
            } else {
                loc.cardSales += total
            }
        }

        // Calculate averages
        const salesByLocation = Object.values(locationData).map(loc => ({
            ...loc,
            avgTicket: loc.transactionCount > 0 ? loc.totalSales / loc.transactionCount : 0
        }))

        // Sort by total sales descending
        salesByLocation.sort((a, b) => b.totalSales - a.totalSales)

        // Calculate totals
        const totals = {
            totalSales: salesByLocation.reduce((sum, l) => sum + l.totalSales, 0),
            cashSales: salesByLocation.reduce((sum, l) => sum + l.cashSales, 0),
            cardSales: salesByLocation.reduce((sum, l) => sum + l.cardSales, 0),
            transactionCount: salesByLocation.reduce((sum, l) => sum + l.transactionCount, 0),
            taxCollected: salesByLocation.reduce((sum, l) => sum + l.taxCollected, 0),
            tipsCollected: salesByLocation.reduce((sum, l) => sum + l.tipsCollected, 0)
        }

        return NextResponse.json({
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: now.toISOString()
            },
            salesByLocation,
            totals,
            locationCount: locations.length
        })

    } catch (error) {
        console.error('Sales by Location error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

