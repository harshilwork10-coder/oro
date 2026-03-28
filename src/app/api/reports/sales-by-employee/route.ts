import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = endDate ? new Date(endDate) : new Date()
        endDateTime.setHours(23, 59, 59, 999)

        let franchiseId = user?.franchiseId

        if (user?.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ employees: [] })
        }

        // Group transactions by employee
        const employeeSales = await prisma.transaction.groupBy({
            by: ['employeeId'],
            where: {
                franchiseId: franchiseId,
                createdAt: { gte: startDateTime, lte: endDateTime },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            _count: { id: true },
            _sum: { total: true },
            orderBy: { _sum: { total: 'desc' } }
        })

        // Get employee names
        const employeeIds = employeeSales.filter(e => e.employeeId).map(e => e.employeeId as string)
        const employees = await prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true }
        })

        const employeeMap = new Map(employees.map(e => [e.id, e.name]))

        const result = employeeSales.map(sale => {
            const revenue = Number(sale._sum?.total || 0)
            const transactionCount = sale._count?.id || 0
            return {
                id: sale.employeeId || 'unknown',
                name: employeeMap.get(sale.employeeId || '') || 'Unknown',
                transactionCount,
                revenue,
                averageTicket: transactionCount > 0 ? revenue / transactionCount : 0
            }
        })

        return NextResponse.json({ employees: result })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

