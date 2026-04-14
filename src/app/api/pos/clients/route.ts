import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pos/clients - Fetch all clients for the franchise with real loyalty data
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const franchiseId = user.franchiseId

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
                loyaltyJoined: true,
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

        // Get loyalty program for this franchise
        const program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId }
        })

        // Batch lookup loyalty balances for clients with phones
        const phonesWithClients = clients
            .filter(c => c.phone)
            .map(c => ({ id: c.id, phone: c.phone! }))

        const loyaltyMap = new Map<string, number>()
        if (program && phonesWithClients.length > 0) {
            const members = await prisma.loyaltyMember.findMany({
                where: {
                    programId: program.id,
                    phone: { in: phonesWithClients.map(p => p.phone) }
                },
                select: {
                    phone: true,
                    pointsBalance: true
                }
            })
            for (const m of members) {
                loyaltyMap.set(m.phone, m.pointsBalance)
            }
        }

        const clientsFormatted = clients.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName || ''}`.trim(),
            phone: c.phone,
            email: c.email,
            loyaltyPoints: c.phone ? (loyaltyMap.get(c.phone) || 0) : 0,
            loyaltyMember: c.loyaltyJoined || (c.phone ? loyaltyMap.has(c.phone) : false),
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
