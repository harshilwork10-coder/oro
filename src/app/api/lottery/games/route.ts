import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/lottery/games - List all lottery games with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')
        const isActive = searchParams.get('isActive')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId
        }

        if (search) {
            whereClause.OR = [
                { gameName: { contains: search } },
                { gameNumber: { contains: search } }
            ]
        }

        if (isActive !== null && isActive !== undefined) {
            whereClause.isActive = isActive === 'true'
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                _count: { select: { packs: true } }
            },
            orderBy: orderBy || { gameName: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const games = await prisma.lotteryGame.findMany(
            queryArgs as Parameters<typeof prisma.lotteryGame.findMany>[0]
        )

        const hasMore = games.length > (take || 50)
        const data = hasMore ? games.slice(0, take || 50) : games
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Failed to fetch lottery games:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

// POST /api/lottery/games - Create new lottery game
export async function POST(req: NextRequest) {
    try {
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { gameName, gameNumber, ticketPrice, prizePool } = body

        if (!gameName || !ticketPrice) {
            return NextResponse.json({ error: 'Game name and ticket price are required' }, { status: 422 })
        }

        const game = await prisma.lotteryGame.create({
            data: {
                franchiseId: user.franchiseId,
                gameName,
                gameNumber: gameNumber || '',
                ticketPrice,
                prizePool: prizePool || null,
                isActive: true
            }
        })

        return NextResponse.json(game, { status: 201 })
    } catch (error) {
        console.error('Failed to create lottery game:', error)
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
}
