/**
 * Labor Report API
 *
 * GET — Labor costs from payroll and shift data
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!user?.franchiseId) return ApiResponse.error('No franchise', 400)

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        // Get revenue for labor % calculation
        const revenueAgg = await prisma.transaction.aggregate({
            where: { franchiseId, status: 'COMPLETED', createdAt: { gte: since } },
            _sum: { total: true },
            _count: { _all: true }
        })
        const revenue = Number(revenueAgg._sum?.total || 0)

        // Get shift data (drawer sessions as proxy for worked shifts)
        const shifts = await prisma.cashDrawerSession.findMany({
            where: {
                location: { franchiseId },
                startTime: { gte: since }
            },
            include: {
                employee: { select: { id: true, name: true } }
            }
        })

        // Calculate hours per employee
        const employeeHours: Record<string, { name: string; hours: number; shifts: number }> = {}
        shifts.forEach(s => {
            const empId = s.employeeId
            const empName = s.employee?.name || 'Unknown'
            if (!employeeHours[empId]) employeeHours[empId] = { name: empName, hours: 0, shifts: 0 }
            employeeHours[empId].shifts++
            if (s.endTime) {
                const hrs = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000
                employeeHours[empId].hours += hrs
            }
        })

        // Get payroll data if available
        const payrollEntries = await prisma.payrollEntry.findMany({
            where: {
                payrollRun: {
                    periodStart: { gte: since },
                    status: { in: ['DRAFT', 'FINALIZED', 'PAID'] }
                }
            },
            include: {
                employee: { select: { id: true, name: true } }
            }
        })

        const totalLaborCost = payrollEntries.reduce((s, e) => s + Number(e.grossPay || 0), 0)
        const totalHours = Object.values(employeeHours).reduce((s, e) => s + e.hours, 0)
        const laborPct = revenue > 0 ? (totalLaborCost / revenue) * 100 : 0

        return ApiResponse.success({
            period: { days, since: since.toISOString() },
            summary: {
                totalRevenue: Math.round(revenue * 100) / 100,
                totalLaborCost: Math.round(totalLaborCost * 100) / 100,
                laborPercent: Math.round(laborPct * 10) / 10,
                totalHoursWorked: Math.round(totalHours * 10) / 10,
                totalShifts: shifts.length,
                employeeCount: Object.keys(employeeHours).length,
                costPerHour: totalHours > 0 ? Math.round((totalLaborCost / totalHours) * 100) / 100 : 0
            },
            employees: Object.entries(employeeHours).map(([id, data]) => {
                const payroll = payrollEntries.filter(e => e.employeeId === id)
                const cost = payroll.reduce((s, e) => s + Number(e.grossPay || 0), 0)
                return {
                    employeeId: id,
                    name: data.name,
                    hours: Math.round(data.hours * 10) / 10,
                    shifts: data.shifts,
                    laborCost: Math.round(cost * 100) / 100
                }
            }).sort((a, b) => b.hours - a.hours),
            hasPayrollData: payrollEntries.length > 0
        })
    } catch (error) {
        console.error('[LABOR_REPORT]', error)
        return ApiResponse.error('Failed to generate labor report', 500)
    }
}
