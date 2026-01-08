import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateCommission, CommissionBreakdown } from '@/lib/commissionCalculator'
import { prisma } from '@/lib/prisma'

// GET /api/payroll/reports - Get payout report for all staff
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only owners and managers can view payout reports
        if (!['OWNER', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const format = searchParams.get('format') // 'json' or 'csv'

        // Default to current week
        const periodEnd = endDate ? new Date(endDate) : new Date()
        const periodStart = startDate
            ? new Date(startDate)
            : new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

        // Get all employees for this franchise
        const employees = await prisma.user.findMany({
            where: {
                franchiseId: user.franchiseId,
                role: { in: ['EMPLOYEE', 'MANAGER'] }
            },
            select: { id: true, name: true, email: true }
        })

        // Calculate commissions for each employee
        const reports: CommissionBreakdown[] = []
        for (const employee of employees) {
            try {
                const breakdown = await calculateCommission(
                    employee.id,
                    periodStart,
                    periodEnd
                )
                reports.push(breakdown)
            } catch (err) {
                console.error(`Failed to calculate for ${employee.id}:`, err)
            }
        }

        // Calculate totals
        const totals = reports.reduce((acc, r) => ({
            totalRevenue: acc.totalRevenue + r.totalRevenue,
            totalCommission: acc.totalCommission + r.totalCommission,
            totalTips: acc.totalTips + r.tips,
            totalGrossPay: acc.totalGrossPay + r.grossPay,
            totalServices: acc.totalServices + r.servicesPerformed,
            totalHours: acc.totalHours + r.hoursWorked
        }), {
            totalRevenue: 0,
            totalCommission: 0,
            totalTips: 0,
            totalGrossPay: 0,
            totalServices: 0,
            totalHours: 0
        })

        // Return CSV format if requested
        if (format === 'csv') {
            const csv = generateCSV(reports, periodStart, periodEnd)
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="payout-report-${periodStart.toISOString().split('T')[0]}-to-${periodEnd.toISOString().split('T')[0]}.csv"`
                }
            })
        }

        return NextResponse.json({
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            employees: reports,
            totals
        })

    } catch (error) {
        console.error('Error generating payout report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}

/**
 * Generate CSV format for download
 */
function generateCSV(reports: CommissionBreakdown[], periodStart: Date, periodEnd: Date): string {
    const headers = [
        'Employee Name',
        'Payment Type',
        'Service Revenue',
        'Product Revenue',
        'Total Revenue',
        'Service Commission',
        'Product Commission',
        'Total Commission',
        'Base Salary',
        'Hourly Wages',
        'Tips',
        'Bonuses',
        'Rental Fee',
        'Gross Pay',
        'Hours Worked',
        'Services Performed',
        'Commission Tier'
    ]

    const rows = reports.map(r => [
        r.employeeName,
        r.paymentType,
        r.serviceRevenue.toFixed(2),
        r.productRevenue.toFixed(2),
        r.totalRevenue.toFixed(2),
        r.serviceCommission.toFixed(2),
        r.productCommission.toFixed(2),
        r.totalCommission.toFixed(2),
        r.baseSalary.toFixed(2),
        r.hourlyWages.toFixed(2),
        r.tips.toFixed(2),
        r.bonuses.toFixed(2),
        r.rentalFee.toFixed(2),
        r.grossPay.toFixed(2),
        r.hoursWorked.toFixed(1),
        r.servicesPerformed.toString(),
        r.currentTier || ''
    ])

    // Add report header
    const reportHeader = `Payout Report: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}\n\n`

    // Combine headers and rows
    const csvContent = reportHeader +
        headers.join(',') + '\n' +
        rows.map(row => row.join(',')).join('\n')

    return csvContent
}
