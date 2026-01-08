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
        const config = await prisma.splitPayoutConfig.findUnique({
            where: { franchiseId: session.user.franchiseId }
        })

        return NextResponse.json(config || { isEnabled: false, royaltyPercent: 6.0, marketingPercent: 2.0 })
    } catch (error) {
        console.error('Error fetching split payout config:', error)
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
        const { isEnabled, royaltyPercent, marketingPercent } = body

        const config = await prisma.splitPayoutConfig.upsert({
            where: { franchiseId: session.user.franchiseId },
            update: {
                isEnabled,
                royaltyPercent: parseFloat(royaltyPercent),
                marketingPercent: parseFloat(marketingPercent)
            },
            create: {
                franchiseId: session.user.franchiseId,
                isEnabled,
                royaltyPercent: parseFloat(royaltyPercent),
                marketingPercent: parseFloat(marketingPercent)
            }
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error updating split payout config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

