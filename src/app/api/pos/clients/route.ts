import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/clients - Fetch all clients for the franchise (mobile + web ready)
export async function GET(req: NextRequest) {
    // Try mobile auth first, then fall back to web session
    let franchiseId: string | null = null

    const mobileUser = await getAuthUser(req)
    if (mobileUser?.franchiseId) {
        franchiseId = mobileUser.franchiseId
    } else {
        // Try web session
        const session = await getServerSession(authOptions)
        if (session?.user?.email) {
            const webUser = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { franchiseId: true }
            })
            franchiseId = webUser?.franchiseId || null
        }
    }

    if (!franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')

    try {
        let whereClause: Record<string, unknown> = { franchiseId }

        // Add search filter if query provided
        if (query && query.length >= 2) {
            whereClause = {
                ...whereClause,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } }
                ]
            }
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                _count: {
                    select: {
                        transactions: true
                    }
                }
            },
            orderBy: {
                firstName: 'asc'
            },
            take: 50
        })

        const clientsFormatted = clients.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName || ''}`.trim(),
            phone: c.phone,
            email: c.email,
            loyaltyPoints: 0,
            vipTier: null,
            visits: c._count.transactions
        }))

        return NextResponse.json({
            success: true,
            data: clientsFormatted
        })
    } catch (error) {
        console.error('[API_CLIENTS_ERROR]', error)
        return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
    }
}
