import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/lottery/games - List all lottery games
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const games = await prisma.lotteryGame.findMany({
            where: { franchiseId: session.user.franchiseId },
            include: {
                _count: {
                    select: { packs: true }
                }
            },
            orderBy: { gameName: 'asc' }
        })

        return NextResponse.json({ games })
    } catch (error) {
        console.error('Failed to fetch lottery games:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

// POST /api/lottery/games - Create new lottery game
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { gameName, gameNumber, ticketPrice, prizePool } = await request.json()

        if (!gameName || !ticketPrice) {
            return NextResponse.json({ error: 'Game name and ticket price are required' }, { status: 400 })
        }

        const game = await prisma.lotteryGame.create({
            data: {
                franchiseId: session.user.franchiseId,
                gameName,
                gameNumber: gameNumber || '',
                ticketPrice,
                prizePool: prizePool || null,
                isActive: true
            }
        })

        return NextResponse.json({ game })
    } catch (error) {
        console.error('Failed to create lottery game:', error)
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
}
