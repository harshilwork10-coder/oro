import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Sell tickets from a pack
export async function POST(
    request: NextRequest,
    { params }: { params: { packId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { quantity } = await request.json()
        const packId = params.packId

        if (!quantity || quantity < 1) {
            return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
        }

        // Get the pack
        const pack = await prisma.lotteryPack.findUnique({
            where: { id: packId },
            include: { game: true }
        })

        if (!pack) {
            return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
        }

        if (pack.status !== 'ACTIVATED') {
            return NextResponse.json({ error: 'Pack is not active' }, { status: 400 })
        }

        const remaining = pack.ticketCount - pack.soldCount
        if (quantity > remaining) {
            return NextResponse.json({ error: `Only ${remaining} tickets remaining` }, { status: 400 })
        }

        const saleAmount = Number(pack.game.ticketPrice) * quantity

        // Update sold count
        const updatedPack = await prisma.lotteryPack.update({
            where: { id: packId },
            data: { soldCount: pack.soldCount + quantity }
        })

        // Record the lottery sale as a transaction
        await prisma.lotteryTransaction.create({
            data: {
                franchiseId: pack.game.franchiseId,
                locationId: pack.locationId,
                packId: packId,
                type: 'SALE',
                amount: saleAmount,
                employeeId: user.id
            }
        })

        return NextResponse.json({
            success: true,
            soldCount: updatedPack.soldCount,
            remaining: updatedPack.ticketCount - updatedPack.soldCount
        })

    } catch (error) {
        console.error('[LOTTERY_SELL]', error)
        return NextResponse.json({ error: 'Failed to sell tickets' }, { status: 500 })
    }
}
