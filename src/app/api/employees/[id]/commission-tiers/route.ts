import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const employeeId = params.id
        const body = await req.json()

        const { tiers } = body // Array of tier objects

        // Delete existing tiers
        await prisma.commissionTier.deleteMany({
            where: { employeeId }
        })

        // Create new tiers
        const createdTiers = await Promise.all(
            tiers.map((tier: any, index: number) =>
                prisma.commissionTier.create({
                    data: {
                        employeeId,
                        minRevenue: tier.minRevenue,
                        maxRevenue: tier.maxRevenue,
                        percentage: tier.percentage,
                        tierName: tier.tierName,
                        priority: index
                    }
                })
            )
        )

        return NextResponse.json({ success: true, tiers: createdTiers })

    } catch (error) {
        console.error('Error setting commission tiers:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const employeeId = params.id

        const tiers = await prisma.commissionTier.findMany({
            where: { employeeId },
            orderBy: { priority: 'asc' }
        })

        return NextResponse.json(tiers)

    } catch (error) {
        console.error('Error fetching commission tiers:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
