import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const rules = await prisma.commissionRule.findMany({
            where: { franchiseId: session.user.franchiseId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        })

        return NextResponse.json(rules)
    } catch (error) {
        console.error('Error fetching commission rules:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, servicePercent, productPercent } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const newRule = await prisma.commissionRule.create({
            data: {
                franchiseId: session.user.franchiseId,
                name,
                servicePercent: parseFloat(servicePercent),
                productPercent: parseFloat(productPercent)
            }
        })

        return NextResponse.json(newRule)
    } catch (error) {
        console.error('Error creating commission rule:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
