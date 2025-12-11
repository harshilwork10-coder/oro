import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = await params

        // Get employee payment config
        const config = await prisma.employeePaymentConfig.findUnique({
            where: { employeeId },
            include: {
                employee: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        })

        // Get commission tiers
        const tiers = await prisma.commissionTier.findMany({
            where: { employeeId },
            orderBy: { priority: 'asc' }
        })

        // Get service overrides
        const overrides = await prisma.serviceCommissionOverride.findMany({
            where: { employeeId }
        })

        // If no config exists, return defaults
        if (!config) {
            return NextResponse.json({
                employeeId,
                paymentType: 'COMMISSION',
                defaultCommissionRate: 0.40,
                usesTieredCommission: false,
                tiers: [],
                serviceOverrides: []
            })
        }

        return NextResponse.json({
            ...config,
            tiers,
            serviceOverrides: overrides
        })

    } catch (error) {
        console.error('Error fetching employee payment config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = await params
        const body = await req.json()

        // Upsert payment config
        const config = await prisma.employeePaymentConfig.upsert({
            where: { employeeId },
            create: {
                employeeId,
                ...body
            },
            update: body
        })

        return NextResponse.json({ success: true, config })

    } catch (error) {
        console.error('Error updating employee payment config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
