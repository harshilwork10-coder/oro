import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/lottery/packs - List lottery packs
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const gameId = searchParams.get('gameId')

        // Get location for user
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        if (!location) {
            return NextResponse.json({ packs: [] })
        }

        const packs = await prisma.lotteryPack.findMany({
            where: {
                locationId: location.id,
                ...(status ? { status } : {}),
                ...(gameId ? { gameId } : {})
            },
            include: {
                game: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ packs })
    } catch (error) {
        console.error('Failed to fetch lottery packs:', error)
        return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 })
    }
}

// POST /api/lottery/packs - Create new lottery pack
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { gameId, packNumber, ticketCount } = await request.json()

        if (!gameId || !packNumber) {
            return NextResponse.json({ error: 'Game and pack number are required' }, { status: 400 })
        }

        // Verify game belongs to franchise
        const game = await prisma.lotteryGame.findFirst({
            where: { id: gameId, franchiseId: session.user.franchiseId }
        })

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 })
        }

        // Get location
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        if (!location) {
            return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        const pack = await prisma.lotteryPack.create({
            data: {
                gameId,
                locationId: location.id,
                packNumber,
                ticketCount: ticketCount || 300,
                soldCount: 0,
                status: 'INVENTORY'
            },
            include: { game: true }
        })

        return NextResponse.json({ pack })
    } catch (error) {
        console.error('Failed to create lottery pack:', error)
        return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 })
    }
}

