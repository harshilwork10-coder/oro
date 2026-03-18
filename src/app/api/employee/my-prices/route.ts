import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch employee's personal pricing / commission rates
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const employee = await prisma.employee.findUnique({
            where: { id: user.employeeId || user.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                commissionRate: true,
                servicePrices: true
            }
        })

        return NextResponse.json({
            commissionRate: employee?.commissionRate,
            servicePrices: employee?.servicePrices || []
        })
    } catch (error) {
        console.error('[EMPLOYEE_MY_PRICES]', error)
        return NextResponse.json({ commissionRate: null, servicePrices: [] })
    }
}

// POST - Update employee's custom service prices
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        await prisma.employee.update({
            where: { id: user.employeeId || user.id },
            data: { servicePrices: body.servicePrices }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[EMPLOYEE_MY_PRICES_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update prices' }, { status: 500 })
    }
}
