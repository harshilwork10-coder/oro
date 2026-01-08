import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { franchiseId?: string; role?: string }

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

        const rules = await prisma.commissionRule.findMany({
            where: { franchiseId: targetFranchiseId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(rules)
    } catch (error) {
        console.error('Error fetching commission rules:', error)
        return NextResponse.json({ error: 'Failed to fetch commission rules' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { franchiseId?: string; role?: string }

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { franchiseId, name, servicePercent, productPercent } = body

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const rule = await prisma.commissionRule.create({
            data: {
                franchiseId: targetFranchiseId,
                name,
                servicePercent: new Decimal(parseFloat(servicePercent) || 0),
                productPercent: new Decimal(parseFloat(productPercent) || 0)
            }
        })

        console.log(`✅ Commission rule created: ${name}`)

        return NextResponse.json(rule)
    } catch (error) {
        console.error('Error creating commission rule:', error)
        return NextResponse.json({ error: 'Failed to create commission rule' }, { status: 500 })
    }
}

