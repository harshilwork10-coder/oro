import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Settle/close a pack
export async function POST(
    request: NextRequest,
    { params }: { params: { packId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const packId = params.packId
        const body = await request.json().catch(() => ({}))
        const { physicalCount } = body

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

        const systemRemaining = pack.ticketCount - pack.soldCount
        const hasDiscrepancy = physicalCount !== undefined && physicalCount !== systemRemaining

        // Update pack to SETTLED status
        const settledPack = await prisma.lotteryPack.update({
            where: { id: packId },
            data: {
                status: 'SETTLED',
                settledAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            packId: settledPack.id,
            packNumber: pack.packNumber,
            gameName: pack.game.gameName,
            ticketCount: pack.ticketCount,
            soldCount: pack.soldCount,
            systemRemaining: systemRemaining,
            physicalCount: physicalCount ?? systemRemaining,
            hasDiscrepancy,
            settledAt: settledPack.settledAt
        })

    } catch (error) {
        console.error('[LOTTERY_SETTLE]', error)
        return NextResponse.json({ error: 'Failed to settle pack' }, { status: 500 })
    }
}
