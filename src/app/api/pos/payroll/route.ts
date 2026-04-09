/**
 * Payroll Export API
 * GET /api/pos/payroll — commission + tips + hours per employee
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

// Safe fallback: if no CommissionRule exists, use 40% (industry standard default)
const DEFAULT_COMMISSION_RATE = 0.40

export const GET = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'week'

    try {
        const now = new Date()
        const startDate = new Date()
        if (period === 'month') startDate.setDate(1)
        else startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)

        const [transactions, timeEntries, employees, commissionRules] = await Promise.all([
            prisma.transaction.findMany({
                where: { franchiseId, createdAt: { gte: startDate }, status: 'COMPLETED' },
                select: { employeeId: true, subtotal: true, tip: true }
            }),
            prisma.timeEntry.findMany({
                where: { user: { franchiseId }, clockIn: { gte: startDate } },
                select: { userId: true, clockIn: true, clockOut: true }
            }),
            prisma.user.findMany({
                where: { franchiseId, role: { in: ['EMPLOYEE', 'MANAGER'] }, isActive: true },
                select: { id: true, name: true, role: true, commissionRuleId: true }
            }),
            // Fetch all commission rules for this franchise
            prisma.commissionRule.findMany({
                where: { franchiseId },
                select: { id: true, name: true, servicePercent: true }
            })
        ])

        // Build commission rule lookup: ruleId → servicePercent (as decimal, e.g. 0.40)
        const ruleMap: Record<string, number> = {}
        for (const rule of commissionRules) {
            ruleMap[rule.id] = Number(rule.servicePercent) / 100
        }

        const empData: Record<string, { revenue: number; tips: number; hours: number }> = {}
        transactions.forEach(t => {
            if (!t.employeeId) return
            if (!empData[t.employeeId]) empData[t.employeeId] = { revenue: 0, tips: 0, hours: 0 }
            empData[t.employeeId].revenue += Number(t.subtotal || 0)
            empData[t.employeeId].tips += Number(t.tip || 0)
        })
        timeEntries.forEach(te => {
            if (!te.userId || !te.clockOut) return
            if (!empData[te.userId]) empData[te.userId] = { revenue: 0, tips: 0, hours: 0 }
            empData[te.userId].hours += (te.clockOut.getTime() - te.clockIn.getTime()) / 3600000
        })

        const payrollEmployees = employees.map(e => {
            const d = empData[e.id] || { revenue: 0, tips: 0, hours: 0 }

            // Use employee's assigned CommissionRule rate, fall back to DEFAULT_COMMISSION_RATE
            const commissionRate = (e.commissionRuleId && ruleMap[e.commissionRuleId] !== undefined)
                ? ruleMap[e.commissionRuleId]
                : DEFAULT_COMMISSION_RATE

            const commission = d.revenue * commissionRate
            return {
                name: e.name || 'Unknown', role: e.role,
                hoursWorked: Math.round(d.hours * 10) / 10,
                serviceRevenue: Math.round(d.revenue * 100) / 100,
                commissionRate, commissionEarned: Math.round(commission * 100) / 100,
                tipsEarned: Math.round(d.tips * 100) / 100,
                totalPay: Math.round((commission + d.tips) * 100) / 100
            }
        }).sort((a, b) => b.totalPay - a.totalPay)

        return NextResponse.json({
            success: true,
            data: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0],
                employees: payrollEmployees,
                totalCommission: payrollEmployees.reduce((s, e) => s + e.commissionEarned, 0),
                totalTips: payrollEmployees.reduce((s, e) => s + e.tipsEarned, 0),
                totalHours: payrollEmployees.reduce((s, e) => s + e.hoursWorked, 0)
            }
        })
    } catch (error) {
        console.error('[PAYROLL_GET]', error)
        return NextResponse.json({ error: 'Failed to load payroll data' }, { status: 500 })
    }
})
