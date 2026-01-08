import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { franchiseId?: string; role?: string }

        if (!user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const franchiseId = searchParams.get('franchiseId')
        const isActive = searchParams.get('isActive')
        const search = searchParams.get('search')

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return ApiResponse.forbidden()
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: targetFranchiseId
        }

        if (isActive !== null && isActive !== undefined) {
            whereClause.isActive = isActive === 'true'
        }

        if (search) {
            whereClause.code = { contains: search }
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const giftCards = await prisma.giftCard.findMany(
            queryArgs as Parameters<typeof prisma.giftCard.findMany>[0]
        )

        const hasMore = giftCards.length > (take || 50)
        const data = hasMore ? giftCards.slice(0, take || 50) : giftCards
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Error fetching gift cards:', error)
        return ApiResponse.serverError('Failed to fetch gift cards')
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { franchiseId?: string; role?: string }

        if (!user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const body = await req.json()
        const { franchiseId, initialAmount, recipientEmail, purchaserId } = body

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return ApiResponse.forbidden()
        }

        if (!initialAmount) {
            return ApiResponse.validationError('Initial amount required')
        }

        // Generate unique code
        const code = `GC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                franchiseId: targetFranchiseId,
                initialAmount: parseFloat(initialAmount),
                currentBalance: parseFloat(initialAmount),
                recipientEmail: recipientEmail || null,
                purchaserId: purchaserId || null,
                isActive: true
            }
        })

        console.log(`✅ Gift card created: ${code} - $${initialAmount}`)

        return ApiResponse.created(giftCard)
    } catch (error) {
        console.error('Error creating gift card:', error)
        return ApiResponse.serverError('Failed to create gift card')
    }
}
