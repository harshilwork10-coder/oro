import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Generate reports (PDF data or CSV)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const reportType = searchParams.get('type') || 'daily-sales'
        const format = searchParams.get('format') || 'json' // json, csv
        const locationId = searchParams.get('locationId') || 'all'
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Parse dates
        const start = startDate ? new Date(startDate) : new Date()
        start.setHours(0, 0, 0, 0)

        const end = endDate ? new Date(endDate) : new Date()
        end.setHours(23, 59, 59, 999)

        // ========== BLOCKED: Full inventory export ==========
        // This is intentionally blocked to retain customers
        if (reportType === 'inventory-full' || reportType === 'product-catalog') {
            return NextResponse.json({
                error: 'This report type is not available for export',
                message: 'For a full product catalog export, please contact support.',
                blocked: true
            }, { status: 403 })
        }

        // ========== ALLOWED REPORTS ==========

        if (reportType === 'daily-sales') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                    ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {}),
                    ...(locationId !== 'all' ? { cashDrawerSession: { locationId } } : {})
                },
                include: {
                    cashDrawerSession: { select: { location: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            })

            const data = transactions.map(tx => ({
                date: tx.createdAt.toISOString().split('T')[0],
                time: tx.createdAt.toTimeString().slice(0, 8),
                invoiceNumber: tx.invoiceNumber || tx.id.slice(-8),
                location: tx.cashDrawerSession?.location?.name || 'Unknown',
                paymentMethod: tx.paymentMethod || 'CASH',
                subtotal: Number(tx.subtotal),
                tax: Number(tx.tax),
                total: Number(tx.total)
            }))

            if (format === 'csv') {
                const headers = ['Date', 'Time', 'Invoice', 'Location', 'Payment', 'Subtotal', 'Tax', 'Total']
                const rows = data.map(d => [d.date, d.time, d.invoiceNumber, d.location, d.paymentMethod, d.subtotal.toFixed(2), d.tax.toFixed(2), d.total.toFixed(2)])
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

                return new NextResponse(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="sales_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv"`
                    }
                })
            }

            return NextResponse.json({
                reportType: 'daily-sales',
                dateRange: { start: start.toISOString(), end: end.toISOString() },
                data,
                summary: {
                    totalTransactions: transactions.length,
                    totalSales: data.reduce((sum, d) => sum + d.total, 0),
                    totalTax: data.reduce((sum, d) => sum + d.tax, 0)
                }
            })
        }

        if (reportType === 'sales-by-category') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                    ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {})
                },
                include: {
                    items: {
                        include: {
                            item: { select: { category: { select: { name: true } } } }
                        }
                    }
                }
            })

            const byCategory: Record<string, { quantity: number, revenue: number }> = {}
            for (const tx of transactions) {
                for (const item of tx.items || []) {
                    const cat = item.item?.category?.name || 'Uncategorized'
                    if (!byCategory[cat]) byCategory[cat] = { quantity: 0, revenue: 0 }
                    byCategory[cat].quantity += item.quantity
                    byCategory[cat].revenue += Number(item.subtotal)
                }
            }

            const data = Object.entries(byCategory)
                .map(([category, stats]) => ({ category, ...stats }))
                .sort((a, b) => b.revenue - a.revenue)

            if (format === 'csv') {
                const headers = ['Category', 'Quantity Sold', 'Revenue']
                const rows = data.map(d => [d.category, d.quantity, d.revenue.toFixed(2)])
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

                return new NextResponse(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="sales_by_category_${start.toISOString().split('T')[0]}.csv"`
                    }
                })
            }

            return NextResponse.json({ reportType: 'sales-by-category', data })
        }

        if (reportType === 'employee-sales') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                    ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {})
                },
                include: {
                    user: { select: { id: true, name: true } }
                }
            })

            const byEmployee: Record<string, { name: string, transactions: number, sales: number }> = {}
            for (const tx of transactions) {
                const empId = tx.user?.id || 'unknown'
                const empName = tx.user?.name || 'Unknown'
                if (!byEmployee[empId]) byEmployee[empId] = { name: empName, transactions: 0, sales: 0 }
                byEmployee[empId].transactions++
                byEmployee[empId].sales += Number(tx.total)
            }

            const data = Object.values(byEmployee).sort((a, b) => b.sales - a.sales)

            if (format === 'csv') {
                const headers = ['Employee', 'Transactions', 'Total Sales']
                const rows = data.map(d => [d.name, d.transactions, d.sales.toFixed(2)])
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

                return new NextResponse(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="employee_sales_${start.toISOString().split('T')[0]}.csv"`
                    }
                })
            }

            return NextResponse.json({ reportType: 'employee-sales', data })
        }

        if (reportType === 'payment-methods') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                    ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {})
                },
                select: { paymentMethod: true, total: true }
            })

            const byMethod: Record<string, { count: number, total: number }> = {}
            for (const tx of transactions) {
                const method = tx.paymentMethod || 'CASH'
                if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 }
                byMethod[method].count++
                byMethod[method].total += Number(tx.total)
            }

            const data = Object.entries(byMethod).map(([method, stats]) => ({
                method,
                count: stats.count,
                total: stats.total
            }))

            return NextResponse.json({ reportType: 'payment-methods', data })
        }

        if (reportType === 'tax-summary') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                    ...(franchiseId ? { cashDrawerSession: { location: { franchiseId } } } : {})
                },
                include: {
                    cashDrawerSession: { select: { location: { select: { id: true, name: true } } } }
                }
            })

            const byLocation: Record<string, { name: string, subtotal: number, tax: number, total: number }> = {}
            for (const tx of transactions) {
                const locId = tx.cashDrawerSession?.location?.id || 'unknown'
                const locName = tx.cashDrawerSession?.location?.name || 'Unknown'
                if (!byLocation[locId]) byLocation[locId] = { name: locName, subtotal: 0, tax: 0, total: 0 }
                byLocation[locId].subtotal += Number(tx.subtotal)
                byLocation[locId].tax += Number(tx.tax)
                byLocation[locId].total += Number(tx.total)
            }

            const data = Object.values(byLocation)

            if (format === 'csv') {
                const headers = ['Location', 'Subtotal', 'Tax Collected', 'Total']
                const rows = data.map(d => [d.name, d.subtotal.toFixed(2), d.tax.toFixed(2), d.total.toFixed(2)])
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

                return new NextResponse(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="tax_summary_${start.toISOString().split('T')[0]}.csv"`
                    }
                })
            }

            return NextResponse.json({
                reportType: 'tax-summary',
                dateRange: { start: start.toISOString(), end: end.toISOString() },
                data,
                totals: {
                    subtotal: data.reduce((sum, d) => sum + d.subtotal, 0),
                    tax: data.reduce((sum, d) => sum + d.tax, 0),
                    total: data.reduce((sum, d) => sum + d.total, 0)
                }
            })
        }

        if (reportType === 'low-stock') {
            // Allowed - doesn't include cost/price
            const items = await prisma.item.findMany({
                where: {
                    ...(franchiseId ? { franchiseId } : {}),
                    stock: { lt: 10 },
                    isActive: true
                },
                select: {
                    name: true,
                    sku: true,
                    stock: true,
                    category: { select: { name: true } }
                },
                orderBy: { stock: 'asc' },
                take: 100
            })

            const data = items.map(item => ({
                name: item.name,
                sku: item.sku || '-',
                category: item.category?.name || 'Uncategorized',
                stock: item.stock
            }))

            return NextResponse.json({ reportType: 'low-stock', data })
        }

        if (reportType === 'loyalty-members') {
            if (!franchiseId) {
                return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
            }

            const program = await prisma.loyaltyProgram.findUnique({
                where: { franchiseId }
            })

            if (!program) {
                return NextResponse.json({ reportType: 'loyalty-members', data: [] })
            }

            const members = await prisma.loyaltyMember.findMany({
                where: { programId: program.id },
                select: {
                    phone: true,
                    name: true,
                    email: true,
                    pointsBalance: true,
                    lifetimeSpend: true,
                    enrolledAt: true,
                    lastActivity: true
                },
                orderBy: { lifetimeSpend: 'desc' }
            })

            const data = members.map(m => ({
                phone: m.phone,
                name: m.name || '-',
                email: m.email || '-',
                points: m.pointsBalance,
                lifetimeSpend: Number(m.lifetimeSpend),
                enrolled: m.enrolledAt.toISOString().split('T')[0],
                lastActivity: m.lastActivity.toISOString().split('T')[0]
            }))

            if (format === 'csv') {
                const headers = ['Phone', 'Name', 'Email', 'Points', 'Lifetime Spend', 'Enrolled', 'Last Activity']
                const rows = data.map(d => [d.phone, d.name, d.email, d.points, d.lifetimeSpend.toFixed(2), d.enrolled, d.lastActivity])
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

                return new NextResponse(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="loyalty_members.csv"`
                    }
                })
            }

            return NextResponse.json({ reportType: 'loyalty-members', data })
        }

        // Available report types
        return NextResponse.json({
            availableReports: [
                { id: 'daily-sales', name: 'Daily Sales', description: 'Transaction-level sales data' },
                { id: 'sales-by-category', name: 'Sales by Category', description: 'Revenue breakdown by product category' },
                { id: 'employee-sales', name: 'Employee Sales', description: 'Sales performance by employee' },
                { id: 'payment-methods', name: 'Payment Methods', description: 'Cash vs Card breakdown' },
                { id: 'tax-summary', name: 'Tax Summary', description: 'Tax collected by location' },
                { id: 'low-stock', name: 'Low Stock Alert', description: 'Items with stock < 10' },
                { id: 'loyalty-members', name: 'Loyalty Members', description: 'Customer loyalty data' }
            ],
            blocked: [
                { id: 'inventory-full', reason: 'Contact support for full product catalog' }
            ]
        })

    } catch (error) {
        console.error('Reports GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
