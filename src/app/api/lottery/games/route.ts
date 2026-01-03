import { NextRequest } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/lottery/games - List all lottery games with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')
        const isActive = searchParams.get('isActive')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: session.user.franchiseId
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

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Failed to fetch lottery games:', error)
        return ApiResponse.serverError('Failed to fetch games')
    }
}

// POST /api/lottery/games - Create new lottery game
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await request.json()
        const { gameName, gameNumber, ticketPrice, prizePool } = body

        if (!gameName || !ticketPrice) {
            return ApiResponse.validationError('Game name and ticket price are required')
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

        return ApiResponse.created(game)
    } catch (error) {
        console.error('Failed to create lottery game:', error)
        return ApiResponse.serverError('Failed to create game')
    }
}
