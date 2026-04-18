import { NextResponse } from 'next/server'
import { getReportScope } from '@/lib/reporting/report-scope'
import { prismaReadonly as prisma } from '@/lib/prisma-readonly'

export async function GET(request: Request) {
    let scope;
    try {
        scope = await getReportScope(request);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 401 })
    }

    try {
        // Build where clause
        const whereClause: any = {
            franchiseId: scope.franchiseId,
            ...scope.locationFilter,
            createdAt: {
                gte: scope.startDate,
                lte: scope.endDate
            },
            status: 'COMPLETED'
        }

        // Fetch all transactions for the date range
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                lineItems: {
                    include: {
                        service: true,
                        product: true,
                        staff: true
                    }
                },
                employee: true
            }
        }) as any[] // Cast to any[] to avoid complex Prisma type issues with includes

        // Calculate Metrics
        const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
        const totalTax = transactions.reduce((sum, tx) => sum + Number(tx.tax), 0)
        const totalTips = transactions.reduce((sum, tx) => sum + Number(tx.tip), 0)
        const netRevenue = totalRevenue - totalTax - totalTips
        const transactionCount = transactions.length
        const averageTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0

        // Payment Method Breakdown
        const paymentMethods: Record<string, number> = {}
        transactions.forEach(tx => {
            const method = tx.paymentMethod
            paymentMethods[method] = (paymentMethods[method] || 0) + Number(tx.total)
        })

        // Staff Performance
        const staffPerformance: Record<string, { name: string, sales: number, count: number }> = {}
        transactions.forEach(tx => {
            if (tx.employee) {
                const empId = tx.employee.id
                if (!staffPerformance[empId]) {
                    staffPerformance[empId] = {
                        name: tx.employee.name || 'Unknown',
                        sales: 0,
                        count: 0
                    }
                }
                staffPerformance[empId].sales += Number(tx.total)
                staffPerformance[empId].count += 1
            }
        })

        // Top Items (Services & Products)
        const itemSales: Record<string, { name: string, type: string, quantity: number, revenue: number }> = {}
        transactions.forEach(tx => {
            tx.lineItems.forEach((item: any) => {
                const id = item.serviceId || item.productId || 'unknown'
                const name = item.service?.name || item.product?.name || 'Unknown Item'
                const type = item.type

                if (!itemSales[id]) {
                    itemSales[id] = { name, type, quantity: 0, revenue: 0 }
                }
                itemSales[id].quantity += item.quantity
                itemSales[id].revenue += Number(item.total)
            })
        })

        // Convert to arrays and sort
        const topItems = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        const staffStats = Object.values(staffPerformance)
            .sort((a, b) => b.sales - a.sales)

        return NextResponse.json({
            date: startOfDay.toISOString(),
            summary: {
                totalRevenue,
                netRevenue,
                totalTax,
                totalTips,
                transactionCount,
                averageTicket
            },
            paymentMethods,
            staffStats,
            topItems,
            hourlySales: getHourlySales(transactions)
        })

    } catch (error) {
        console.error('Error generating daily report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function getHourlySales(transactions: any[]) {
    const hourly: Record<string, number> = {}
    // Initialize 9 AM to 9 PM
    for (let i = 9; i <= 21; i++) {
        hourly[`${i}:00`] = 0
    }

    transactions.forEach(tx => {
        const date = new Date(tx.createdAt)
        const hour = date.getHours()
        const key = `${hour}:00`
        if (hourly[key] !== undefined) {
            hourly[key] += Number(tx.total)
        } else {
            // Handle off-hours
            hourly[key] = (hourly[key] || 0) + Number(tx.total)
        }
    })

    return Object.entries(hourly).map(([hour, sales]) => ({ hour, sales }))
}

