import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// AUDIT STANDARD: Proper decimal rounding to prevent penny errors
function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
}

// Standardized transaction statuses for financial reports (CPA-compliant)
const COMPLETED_STATUSES = ['COMPLETED', 'APPROVED'] as const

// GET - Generate Sales Tax Report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || !['OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'monthly' // monthly, quarterly, yearly
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
        const quarter = parseInt(searchParams.get('quarter') || Math.ceil((new Date().getMonth() + 1) / 3).toString())
        const locationId = searchParams.get('locationId') || 'all'

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Determine date range based on period
        let startDate: Date
        let endDate: Date

        if (period === 'monthly') {
            startDate = new Date(year, month - 1, 1)
            endDate = new Date(year, month, 0, 23, 59, 59, 999)
        } else if (period === 'quarterly') {
            const quarterStart = (quarter - 1) * 3
            startDate = new Date(year, quarterStart, 1)
            endDate = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999)
        } else { // yearly
            startDate = new Date(year, 0, 1)
            endDate = new Date(year, 11, 31, 23, 59, 59, 999)
        }

        // Get locations for this franchise
        const locations = await prisma.location.findMany({
            where: {
                ...(franchiseId ? { franchiseId } : {}),
                ...(locationId !== 'all' ? { id: locationId } : {})
            },
            select: { id: true, name: true, address: true }
        })

        // Get transactions for the period
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { in: [...COMPLETED_STATUSES] },
                ...(franchiseId ? { franchiseId } : {}),
                ...(locationId !== 'all' ? { cashDrawerSession: { locationId } } : {})
            },
            include: {
                cashDrawerSession: {
                    select: { locationId: true, location: { select: { name: true } } }
                }
            }
        })

        // Aggregate by location
        const taxByLocation: Record<string, {
            locationId: string
            locationName: string
            grossSales: number
            taxableSales: number
            nonTaxableSales: number
            taxCollected: number
            transactionCount: number
        }> = {}

        // Initialize all locations
        for (const loc of locations) {
            taxByLocation[loc.id] = {
                locationId: loc.id,
                locationName: loc.name,
                grossSales: 0,
                taxableSales: 0,
                nonTaxableSales: 0,
                taxCollected: 0,
                transactionCount: 0
            }
        }

        // Process transactions
        for (const tx of transactions) {
            const locId = tx.cashDrawerSession?.locationId || 'unknown'
            const locName = tx.cashDrawerSession?.location?.name || 'Unknown'

            if (!taxByLocation[locId]) {
                taxByLocation[locId] = {
                    locationId: locId,
                    locationName: locName,
                    grossSales: 0,
                    taxableSales: 0,
                    nonTaxableSales: 0,
                    taxCollected: 0,
                    transactionCount: 0
                }
            }

            const subtotal = Number(tx.subtotal)
            const tax = Number(tx.tax)

            taxByLocation[locId].grossSales = roundCurrency(taxByLocation[locId].grossSales + subtotal + tax)
            taxByLocation[locId].taxCollected = roundCurrency(taxByLocation[locId].taxCollected + tax)
            taxByLocation[locId].transactionCount++

            // Estimate taxable vs non-taxable (if tax > 0, it was taxable)
            if (tax > 0) {
                taxByLocation[locId].taxableSales = roundCurrency(taxByLocation[locId].taxableSales + subtotal)
            } else {
                taxByLocation[locId].nonTaxableSales = roundCurrency(taxByLocation[locId].nonTaxableSales + subtotal)
            }
        }

        const locationBreakdown = Object.values(taxByLocation).filter(l => l.transactionCount > 0)

        // Calculate totals - AUDIT: Use proper rounding
        const totals = {
            grossSales: roundCurrency(locationBreakdown.reduce((sum, l) => sum + l.grossSales, 0)),
            taxableSales: roundCurrency(locationBreakdown.reduce((sum, l) => sum + l.taxableSales, 0)),
            nonTaxableSales: roundCurrency(locationBreakdown.reduce((sum, l) => sum + l.nonTaxableSales, 0)),
            taxCollected: roundCurrency(locationBreakdown.reduce((sum, l) => sum + l.taxCollected, 0)),
            transactionCount: locationBreakdown.reduce((sum, l) => sum + l.transactionCount, 0)
        }

        // Calculate average tax rate
        const avgTaxRate = totals.taxableSales > 0
            ? (totals.taxCollected / totals.taxableSales) * 100
            : 0

        // Generate period label
        let periodLabel = ''
        if (period === 'monthly') {
            periodLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        } else if (period === 'quarterly') {
            periodLabel = `Q${quarter} ${year}`
        } else {
            periodLabel = `${year}`
        }

        // Daily breakdown for the period
        const dailyTax: Record<string, { date: string, sales: number, tax: number }> = {}
        for (const tx of transactions) {
            const dateKey = tx.createdAt.toISOString().split('T')[0]
            if (!dailyTax[dateKey]) {
                dailyTax[dateKey] = { date: dateKey, sales: 0, tax: 0 }
            }
            dailyTax[dateKey].sales = roundCurrency(dailyTax[dateKey].sales + Number(tx.subtotal))
            dailyTax[dateKey].tax = roundCurrency(dailyTax[dateKey].tax + Number(tx.tax))
        }
        const dailyBreakdown = Object.values(dailyTax).sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json({
            report: {
                period,
                periodLabel,
                year,
                month: period === 'monthly' ? month : undefined,
                quarter: period === 'quarterly' ? quarter : undefined,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                }
            },
            totals,
            avgTaxRate: avgTaxRate.toFixed(2),
            locationBreakdown,
            dailyBreakdown,
            generatedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Sales Tax Report error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

