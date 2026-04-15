/**
 * Employee Summary API
 * GET /api/employees/[id]/summary?period=today|week|month
 * 
 * Returns employee details + commission summary + revenue stats.
 * Used by the employee detail page.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(req.url)
        const period = url.searchParams.get('period') || 'month'

        // Fetch employee
        const employee = await prisma.user.findFirst({
            where: { id, franchiseId: user.franchiseId },
            select: { id: true, name: true, email: true, phone: true, role: true, isActive: true }
        })
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        // Date range
        const now = new Date()
        const startDate = new Date()
        if (period === 'month') startDate.setDate(1)
        else if (period === 'week') startDate.setDate(now.getDate() - now.getDay())
        else startDate.setHours(0, 0, 0, 0) // today
        startDate.setHours(0, 0, 0, 0)

        // Fetch compensation plan
        const compPlan = await prisma.compensationPlan.findFirst({
            where: { userId: id, effectiveTo: null },
            orderBy: { effectiveFrom: 'desc' }
        })

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                employeeId: id,
                franchiseId: user.franchiseId,
                createdAt: { gte: startDate },
                status: 'COMPLETED'
            },
            include: {
                lineItems: { select: { type: true, quantity: true, price: true, serviceNameSnapshot: true, productNameSnapshot: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        // Calculate stats
        let totalRevenue = 0, totalTips = 0, totalServices = 0, totalProducts = 0
        const serviceMap: Record<string, { count: number; revenue: number }> = {}

        transactions.forEach(tx => {
            totalRevenue += Number(tx.subtotal || 0)
            totalTips += Number(tx.tip || 0)
            tx.lineItems?.forEach((li: any) => {
                if (li.type === 'SERVICE') {
                    totalServices++
                    const name = li.serviceNameSnapshot || 'Service'
                    if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0 }
                    serviceMap[name].count++
                    serviceMap[name].revenue += Number(li.price || 0) * (li.quantity || 1)
                }
                if (li.type === 'PRODUCT') {
                    totalProducts += li.quantity || 1
                }
            })
        })

        const commissionRate = compPlan?.commissionSplit ? Number(compPlan.commissionSplit) : 0
        const estCommissions = totalRevenue * (commissionRate / 100)

        const topServices = Object.entries(serviceMap)
            .map(([name, d]) => ({ name, count: d.count, revenue: Math.round(d.revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)

        return NextResponse.json({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            isActive: employee.isActive ?? true,
            compensation: compPlan ? {
                type: compPlan.compensationType,
                commissionRate,
                hourlyRate: Number(compPlan.hourlyRate || 0)
            } : null,
            stats: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalTips: Math.round(totalTips * 100) / 100,
                totalTransactions: transactions.length,
                avgTicket: transactions.length > 0 ? Math.round((totalRevenue / transactions.length) * 100) / 100 : 0,
                totalServices,
                totalProducts,
                estCommissions: Math.round(estCommissions * 100) / 100
            },
            recentTransactions: transactions.slice(0, 15).map(tx => ({
                id: tx.id,
                date: tx.createdAt.toISOString(),
                total: Math.round(Number(tx.total || 0) * 100) / 100,
                tip: Math.round(Number(tx.tip || 0) * 100) / 100,
                items: tx.lineItems?.length || 0,
                source: (tx as any).source || 'POS'
            })),
            topServices
        })
    } catch (error) {
        console.error('[EMPLOYEE_SUMMARY_GET]', error)
        return NextResponse.json({ error: 'Failed to load employee summary' }, { status: 500 })
    }
}
