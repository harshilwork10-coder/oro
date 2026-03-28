import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/lottery/packs - List lottery packs with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const status = searchParams.get('status')
        const gameId = searchParams.get('gameId')

        // Get location for user
        const location = await prisma.location.findFirst({
            where: { franchise: { id: user.franchiseId } }
        })

        if (!location) {
            return NextResponse.json({ packs: [], pagination: { hasMore: false, nextCursor: null } })
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            locationId: location.id
        }
        if (status) whereClause.status = status
        if (gameId) whereClause.gameId = gameId

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: { game: true },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const packs = await prisma.lotteryPack.findMany(
            queryArgs as Parameters<typeof prisma.lotteryPack.findMany>[0]
        )

        const hasMore = packs.length > (take || 50)
        const data = hasMore ? packs.slice(0, take || 50) : packs
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Failed to fetch lottery packs:', error)
        return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 })
    }
}

// POST /api/lottery/packs - Create new lottery pack
export async function POST(req: NextRequest) {
    try {
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { gameId, packNumber, ticketCount } = body

        if (!gameId || !packNumber) {
            return NextResponse.json({ error: 'Game and pack number are required' }, { status: 422 })
        }

        // Verify game belongs to franchise
        const game = await prisma.lotteryGame.findFirst({
            where: { id: gameId, franchiseId: user.franchiseId }
        })

        if (!game) {
            return NextResponse.json({ error: 'Game' }, { status: 404 })
        }

        // Get location
        const location = await prisma.location.findFirst({
            where: { franchise: { id: user.franchiseId } }
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

        return NextResponse.json(pack, { status: 201 })
    } catch (error) {
        console.error('Failed to create lottery pack:', error)
        return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 })
    }
}
