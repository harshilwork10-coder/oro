import { NextRequest } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET /api/lottery/packs - List lottery packs with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const status = searchParams.get('status')
        const gameId = searchParams.get('gameId')

        // Get location for user
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        if (!location) {
            return ApiResponse.success({ packs: [], pagination: { hasMore: false, nextCursor: null } })
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

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Failed to fetch lottery packs:', error)
        return ApiResponse.serverError('Failed to fetch packs')
    }
}

// POST /api/lottery/packs - Create new lottery pack
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await request.json()
        const { gameId, packNumber, ticketCount } = body

        if (!gameId || !packNumber) {
            return ApiResponse.validationError('Game and pack number are required')
        }

        // Verify game belongs to franchise
        const game = await prisma.lotteryGame.findFirst({
            where: { id: gameId, franchiseId: session.user.franchiseId }
        })

        if (!game) {
            return ApiResponse.notFound('Game')
        }

        // Get location
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        if (!location) {
            return ApiResponse.error('No location found', 400)
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

        return ApiResponse.created(pack)
    } catch (error) {
        console.error('Failed to create lottery pack:', error)
        return ApiResponse.serverError('Failed to create pack')
    }
}
