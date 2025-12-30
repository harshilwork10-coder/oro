import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Record lottery payout
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { amount, ticketNumber, locationId } = await request.json()

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
        }

        // Create payout transaction
        const payout = await prisma.lotteryTransaction.create({
            data: {
                franchiseId: user.franchiseId,
                locationId: locationId || user.locationId,
                type: 'PAYOUT',
                amount: amount,
                ticketNumber: ticketNumber || null,
                employeeId: user.id
            }
        })

        return NextResponse.json({
            success: true,
            payoutId: payout.id,
            amount: payout.amount
        })

    } catch (error) {
        console.error('[LOTTERY_PAYOUT]', error)
        return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 })
    }
}

// GET - Get payout history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')

        const payouts = await prisma.lotteryTransaction.findMany({
            where: {
                franchiseId: user.franchiseId,
                type: 'PAYOUT'
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        return NextResponse.json({ payouts })

    } catch (error) {
        console.error('[LOTTERY_PAYOUT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }
}

