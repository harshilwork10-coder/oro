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

        // Get commission rules for this employee
        const commissionRules = await prisma.commissionRule.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                type: true,
                rate: true,
                flatAmount: true,
            }
        })

        // Get employee service price overrides
        const priceOverrides = await prisma.employeeServicePriceOverride.findMany({
            where: { userId: user.id },
            include: { service: { select: { id: true, name: true, price: true } } }
        })

        return NextResponse.json({
            commissionRules,
            priceOverrides: priceOverrides.map(o => ({
                serviceId: o.serviceId,
                serviceName: o.service?.name,
                basePrice: Number(o.service?.price || 0),
                overridePrice: Number(o.price),
            }))
        })
    } catch (error) {
        console.error('[EMPLOYEE_MY_PRICES]', error)
        return NextResponse.json({ commissionRules: [], priceOverrides: [] })
    }
}
