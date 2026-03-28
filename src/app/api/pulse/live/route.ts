import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pulse/live
 * Live dashboard data for Pulse app
 * Returns industry-appropriate data:
 * - RETAIL: products, inventory, low stock
 * - SERVICE/SALON: appointments, services, upcoming bookings
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId') // 'all' or specific location ID

        // Get industry type from session
        const industryType = (user as any)?.industryType || 'SERVICE'

        // Get user with their franchisor info (owner gets access to all locations)
        if (!user?.franchise) {
            return NextResponse.json({
                industryType,
                locations: [],
                stats: { todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0, lastHourSales: 0 },
                storeBreakdown: [],
                topSellers: [],
                // Industry-specific empty arrays
                lowStockItems: [],
                upcomingAppointments: [],
                employeesOnClock: []
            })
        }

        const locations = user.franchise.locations || []
        const franchiseId = user.franchise.id

        // Build location filter
        const locationFilter = locationId && locationId !== 'all'
            ? { locationId }
            : { franchiseId }

        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - 7)

        // Use any casting to bypass stale Prisma types
        const prismaAny = prisma as any

        // Get today's transactions (all locations or specific)
        const todayTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: today },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            include: {
                employee: { select: { name: true } },
                client: { select: { firstName: true, lastName: true } },
                location: { select: { id: true, name: true } },
                lineItems: { include: { product: { select: { name: true, costPrice: true, productCategory: { select: { name: true } } } }, service: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        }) as any[]

        // Yesterday's transactions
        const yesterdayTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: yesterday, lt: today },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            select: { total: true }
        }) as any[]

        // Week transactions
        const weekTransactions = await prismaAny.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: weekStart },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            select: { total: true }
        }) as any[]

        // Calculate totals
        const todaySales = todayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const yesterdaySales = yesterdayTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const weekSales = weekTransactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
        const transactionCount = todayTransactions.length
        const averageTicket = transactionCount > 0 ? todaySales / transactionCount : 0

        // ===== PROFIT / COGS CALCULATION =====
        let todayCost = 0
        todayTransactions.forEach((tx: any) => {
            tx.lineItems?.forEach((item: any) => {
                if (item.product?.costPrice) {
                    todayCost += Number(item.product.costPrice) * (item.quantity || 1)
                }
            })
        })
        const todayProfit = todaySales - todayCost
        const profitMargin = todaySales > 0 ? (todayProfit / todaySales) * 100 : 0

        // ===== EMPLOYEE SCOREBOARD =====
        const employeeSalesMap: Record<string, { id: string, name: string, totalSales: number, transactionCount: number }> = {}
        todayTransactions.forEach((tx: any) => {
            const empId = tx.employeeId || 'unknown'
            const empName = tx.employee?.name || 'Unknown'
            if (!employeeSalesMap[empId]) {
                employeeSalesMap[empId] = { id: empId, name: empName, totalSales: 0, transactionCount: 0 }
            }
            employeeSalesMap[empId].totalSales += Number(tx.total)
            employeeSalesMap[empId].transactionCount++
        })
        const employeeRanking = Object.values(employeeSalesMap)
            .filter(e => e.id !== 'unknown')
            .map(e => ({
                ...e,
                averageTicket: e.transactionCount > 0 ? e.totalSales / e.transactionCount : 0
            }))
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 10)

        // ===== PAYMENT BREAKDOWN =====
        const paymentBreakdown = { cash: 0, card: 0, other: 0, cashCount: 0, cardCount: 0, otherCount: 0 }
        todayTransactions.forEach((tx: any) => {
            const method = (tx.paymentMethod || '').toUpperCase()
            const amount = Number(tx.total)
            if (method === 'CASH') {
                paymentBreakdown.cash += amount
                paymentBreakdown.cashCount++
            } else if (['CREDIT_CARD', 'DEBIT_CARD', 'CARD'].includes(method)) {
                paymentBreakdown.card += amount
                paymentBreakdown.cardCount++
            } else if (method === 'SPLIT') {
                paymentBreakdown.cash += Number(tx.cashAmount || 0)
                paymentBreakdown.card += Number(tx.cardAmount || 0)
                paymentBreakdown.cashCount++
                paymentBreakdown.cardCount++
            } else {
                paymentBreakdown.other += amount
                paymentBreakdown.otherCount++
            }
        })

        // ===== TAX BREAKDOWN (per jurisdiction) =====
        let taxBreakdown: any[] = []
        try {
            const todayTaxLines = await prismaAny.transactionTaxLine.findMany({
                where: {
                    transaction: {
                        ...locationFilter,
                        createdAt: { gte: today },
                        status: { in: ['COMPLETED', 'APPROVED'] }
                    }
                },
                select: {
                    taxName: true,
                    taxRate: true,
                    taxableAmount: true,
                    taxAmount: true
                }
            }) as any[]

            // Aggregate by taxName
            const taxMap: Record<string, { taxName: string, taxRate: number, taxableAmount: number, taxAmount: number }> = {}
            todayTaxLines.forEach((tl: any) => {
                const key = tl.taxName
                if (!taxMap[key]) {
                    taxMap[key] = { taxName: tl.taxName, taxRate: Number(tl.taxRate), taxableAmount: 0, taxAmount: 0 }
                }
                taxMap[key].taxableAmount += Number(tl.taxableAmount)
                taxMap[key].taxAmount += Number(tl.taxAmount)
            })
            taxBreakdown = Object.values(taxMap).sort((a, b) => b.taxAmount - a.taxAmount)
        } catch (e) {
            // TransactionTaxLine may not exist yet
        }

        // ===== CATEGORY SALES RANKING =====
        const categorySalesMap: Record<string, { name: string, revenue: number, quantity: number }> = {}
        todayTransactions.forEach((tx: any) => {
            tx.lineItems?.forEach((item: any) => {
                const catName = item.product?.productCategory?.name || item.service?.name || 'Other'
                if (!categorySalesMap[catName]) {
                    categorySalesMap[catName] = { name: catName, revenue: 0, quantity: 0 }
                }
                categorySalesMap[catName].revenue += Number(item.total) || 0
                categorySalesMap[catName].quantity += item.quantity || 1
            })
        })
        const categorySales = Object.values(categorySalesMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // ===== REPEAT CUSTOMER % =====
        const clientIds = todayTransactions
            .map((tx: any) => tx.clientId)
            .filter((id: any) => id != null)
        const uniqueClients = new Set(clientIds).size
        const repeatCustomerPct = transactionCount > 0
            ? Math.round((clientIds.length / transactionCount) * 100)
            : 0

        // ===== VOID / REFUND COUNTS =====
        let voidCount = 0
        let refundCount = 0
        try {
            voidCount = await prismaAny.transaction.count({
                where: {
                    ...locationFilter,
                    createdAt: { gte: today },
                    status: 'VOIDED'
                }
            })
            refundCount = await prismaAny.transaction.count({
                where: {
                    ...locationFilter,
                    createdAt: { gte: today },
                    status: 'REFUNDED'
                }
            })
        } catch (e) {
            // safe fallback
        }

        const taxCollected = todayTransactions.reduce((sum: number, t: any) => sum + Number(t.tax || 0), 0)

        // ===== HIGH-VALUE INVOICES (Top 5 by total) =====
        const highValueInvoices = todayTransactions
            .sort((a: any, b: any) => Number(b.total) - Number(a.total))
            .slice(0, 5)
            .map((tx: any) => ({
                id: tx.id,
                invoiceNumber: tx.invoiceNumber || tx.id.slice(-6).toUpperCase(),
                total: Number(tx.total),
                subtotal: Number(tx.subtotal),
                tax: Number(tx.tax || 0),
                discount: Number(tx.discount || 0),
                paymentMethod: tx.paymentMethod,
                employee: tx.employee?.name || 'Unknown',
                client: tx.client ? `${tx.client.firstName || ''} ${tx.client.lastName || ''}`.trim() : null,
                time: tx.createdAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || '',
                location: tx.location?.name || '',
                items: (tx.lineItems || []).map((li: any) => ({
                    name: li.product?.name || li.service?.name || li.name || 'Item',
                    quantity: li.quantity || 1,
                    price: Number(li.price),
                    discount: Number(li.discount || 0),
                    total: Number(li.total)
                }))
            }))

        // ===== DISCOUNT TRACKER =====
        let totalDiscounts = 0
        const discountByEmployee: Record<string, { name: string, discountTotal: number, count: number }> = {}
        todayTransactions.forEach((tx: any) => {
            const disc = Number(tx.discount || 0)
            if (disc > 0) {
                totalDiscounts += disc
                const empName = tx.employee?.name || 'Unknown'
                const empId = tx.employeeId || 'unknown'
                if (!discountByEmployee[empId]) {
                    discountByEmployee[empId] = { name: empName, discountTotal: 0, count: 0 }
                }
                discountByEmployee[empId].discountTotal += disc
                discountByEmployee[empId].count++
            }
        })
        const discountTracker = {
            totalDiscounts,
            discountPctOfRevenue: todaySales > 0 ? (totalDiscounts / todaySales) * 100 : 0,
            transactionsWithDiscount: Object.values(discountByEmployee).reduce((s, e) => s + e.count, 0),
            byEmployee: Object.values(discountByEmployee).sort((a, b) => b.discountTotal - a.discountTotal)
        }

        // ===== HOURLY SALES CHART =====
        const hourlySales: { hour: number, label: string, sales: number, count: number }[] = []
        for (let h = 0; h < 24; h++) {
            hourlySales.push({ hour: h, label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`, sales: 0, count: 0 })
        }
        todayTransactions.forEach((tx: any) => {
            const hour = tx.createdAt?.getHours() ?? 0
            hourlySales[hour].sales += Number(tx.total)
            hourlySales[hour].count++
        })

        // ===== RECENT ACTIVITY FEED (last 10) =====
        const recentActivity = todayTransactions
            .slice(0, 10)
            .map((tx: any) => ({
                id: tx.id,
                invoiceNumber: tx.invoiceNumber || tx.id.slice(-6).toUpperCase(),
                total: Number(tx.total),
                paymentMethod: tx.paymentMethod,
                employee: tx.employee?.name || 'Unknown',
                client: tx.client ? `${tx.client.firstName || ''} ${tx.client.lastName || ''}`.trim() : null,
                time: tx.createdAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || '',
                itemCount: tx.lineItems?.length || 0,
                discount: Number(tx.discount || 0),
                location: tx.location?.name || ''
            }))

        // ===== SUSPICIOUS ACTIVITY =====
        let noSaleDrawerOpens = 0
        try {
            noSaleDrawerOpens = await prismaAny.drawerActivity.count({
                where: {
                    ...locationFilter,
                    createdAt: { gte: today },
                    type: 'NO_SALE'
                }
            })
        } catch (e) { /* DrawerActivity may not exist */ }

        const bigDiscountTxns = todayTransactions.filter((tx: any) => {
            const disc = Number(tx.discount || 0)
            const sub = Number(tx.subtotal || 0)
            return sub > 0 && (disc / sub) > 0.20
        }).length

        const suspiciousActivity = {
            noSaleDrawerOpens,
            bigDiscountCount: bigDiscountTxns,
            voidCount,
            refundCount,
            hasAlerts: noSaleDrawerOpens > 0 || bigDiscountTxns > 0 || voidCount > 2 || refundCount > 2
        }

        // Per-store breakdown (only if showing all stores)
        const storeBreakdown = locationId === 'all' || !locationId
            ? locations.map((loc: any) => {
                const locSales = todayTransactions
                    .filter((t: any) => t.location?.id === loc.id)
                    .reduce((sum: number, t: any) => sum + Number(t.total), 0)
                const locCount = todayTransactions.filter((t: any) => t.location?.id === loc.id).length
                return {
                    id: loc.id,
                    name: loc.name,
                    todaySales: locSales,
                    transactionCount: locCount
                }
            })
            : []

        // Top sellers - include both products AND services
        const itemSales: Record<string, { name: string, type: string, quantity: number, revenue: number }> = {}
        todayTransactions.forEach((tx: any) => {
            tx.lineItems?.forEach((item: any) => {
                const name = item.product?.name || item.service?.name || item.name || 'Unknown'
                const type = item.product ? 'product' : item.service ? 'service' : 'other'
                if (!itemSales[name]) {
                    itemSales[name] = { name, type, quantity: 0, revenue: 0 }
                }
                itemSales[name].quantity += item.quantity || 1
                itemSales[name].revenue += Number(item.total) || 0
            })
        })
        const topSellers = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        // Industry-specific data
        let lowStockItems: any[] = []
        let upcomingAppointments: any[] = []

        if (industryType === 'RETAIL') {
            // RETAIL: Get low stock items
            lowStockItems = await prismaAny.product.findMany({
                where: {
                    franchiseId,
                    stock: { lte: 5 },
                    status: 'ACTIVE'
                },
                select: {
                    id: true,
                    name: true,
                    stock: true,
                    location: { select: { name: true } }
                },
                take: 10
            }).then((items: any[]) => items.map((p: any) => ({
                id: p.id,
                name: p.name,
                stock: p.stock || 0,
                location: p.location?.name || 'Main'
            }))).catch(() => [])
        } else {
            // SERVICE/SALON: Get upcoming appointments today
            upcomingAppointments = await prismaAny.appointment.findMany({
                where: {
                    franchiseId,
                    startTime: { gte: now },
                    status: { in: ['SCHEDULED', 'CONFIRMED'] }
                },
                select: {
                    id: true,
                    startTime: true,
                    client: { select: { firstName: true, lastName: true } },
                    service: { select: { name: true } },
                    employee: { select: { name: true } }
                },
                orderBy: { startTime: 'asc' },
                take: 10
            }).then((appts: any[]) => appts.map((a: any) => ({
                id: a.id,
                time: new Date(a.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                client: `${a.client?.firstName || ''} ${a.client?.lastName || ''}`.trim() || 'Walk-in',
                service: a.service?.name || 'Service',
                employee: a.employee?.name || 'Any'
            }))).catch(() => [])
        }

        // Employees on clock
        let employeesOnClock: any[] = []
        try {
            const activeShifts = await prismaAny.shift.findMany({
                where: {
                    clockOut: null
                },
                include: {
                    employee: { select: { name: true } },
                    location: { select: { name: true } }
                }
            }) as any[]
            employeesOnClock = activeShifts.map((shift: any) => ({
                name: shift.employee?.name || 'Unknown',
                location: shift.location?.name || 'Unknown',
                since: shift.clockIn?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || ''
            }))
        } catch (e) {
            // Shift model may not exist, that's ok
        }

        return NextResponse.json({
            industryType,
            locations,
            stats: {
                todaySales,
                yesterdaySales,
                weekSales,
                transactionCount,
                averageTicket,
                todayCost,
                todayProfit,
                profitMargin,
                lastHourSales: 0
            },
            storeBreakdown,
            topSellers,
            // NEW: Enhanced analytics
            employeeRanking,
            paymentBreakdown,
            taxBreakdown,
            taxCollected,
            categorySales,
            repeatCustomerPct,
            uniqueClients,
            voidCount,
            refundCount,
            // NEW: Advanced widgets
            highValueInvoices,
            discountTracker,
            hourlySales,
            recentActivity,
            suspiciousActivity,
            // Industry-specific data
            lowStockItems,
            upcomingAppointments,
            employeesOnClock
        })

    } catch (error) {
        console.error('Pulse live error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

