import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId')

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const plans = await prisma.membershipPlan.findMany({
            where: { franchiseId: targetFranchiseId },
            orderBy: { price: 'asc' }
        })

        return NextResponse.json(plans)
    } catch (error) {
        console.error('Error fetching membership plans:', error)
        return NextResponse.json({ error: 'Failed to fetch membership plans' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { franchiseId, name, price, billingInterval, description } = body

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const plan = await prisma.membershipPlan.create({
            data: {
                franchiseId: targetFranchiseId,
                name,
                price: parseFloat(price),
                billingInterval: billingInterval || 'MONTHLY',
                description: description || null,
                isActive: true
            }
        })

        console.log(`✅ Membership plan created: ${name} - $${price}`)

        return NextResponse.json(plan)
    } catch (error) {
        console.error('Error creating membership plan:', error)
        return NextResponse.json({ error: 'Failed to create membership plan' }, { status: 500 })
    }
}
