import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'
import { authenticatePOSRequest } from '@/lib/posAuth'
import { logActivity } from '@/lib/auditLog'

/**
 * Dual auth helper: tries station token first (for Android POS),
 * falls back to NextAuth web session.
 */
async function resolveAuth(req: NextRequest): Promise<{ franchiseId: string; role?: string } | null> {
    // Try POS station token first
    const stationToken = req.headers.get('x-station-token')
    if (stationToken) {
        const result = await authenticatePOSRequest(req)
        if ('ctx' in result) {
            return { franchiseId: result.ctx.franchiseId, role: 'STATION' }
        }
        return null // Invalid token
    }

    // Fall back to NextAuth web session
    if (!user?.franchiseId) return null
    return { franchiseId: user.franchiseId, role: user.role }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const auth = await resolveAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const franchiseId = searchParams.get('franchiseId')
        const isActive = searchParams.get('isActive')
        const search = searchParams.get('search')

        // Security: Use auth franchiseId or verify ownership
        const targetFranchiseId = franchiseId || auth.franchiseId
        if (targetFranchiseId !== auth.franchiseId && auth.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Error fetching gift cards:', error)
        return NextResponse.json({ error: 'Failed to fetch gift cards' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await resolveAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { franchiseId, initialAmount, recipientEmail, purchaserId } = body

        // Security: Use auth franchiseId or verify ownership
        const targetFranchiseId = franchiseId || auth.franchiseId
        if (targetFranchiseId !== auth.franchiseId && auth.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (!initialAmount) {
            return NextResponse.json({ error: 'Initial amount required' }, { status: 422 })
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

        // Audit log
        await logActivity({
            userId: 'system',
            userEmail: 'pos',
            userRole: auth.role || 'STATION',
            action: 'GIFT_CARD_CREATE',
            entityType: 'GiftCard',
            entityId: giftCard.id,
            metadata: { code, initialAmount: parseFloat(initialAmount), franchiseId: targetFranchiseId }
        })

        return NextResponse.json(giftCard, { status: 201 })
    } catch (error) {
        console.error('Error creating gift card:', error)
        return NextResponse.json({ error: 'Failed to create gift card' }, { status: 500 })
    }
}
