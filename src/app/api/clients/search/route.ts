import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET: Search clients
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('query')
        const requestedFranchiseId = searchParams.get('franchiseId')

        // Use session franchiseId — validate if client-provided differs
const franchiseId = requestedFranchiseId || user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        // Security: Only PROVIDER can search across franchises
        if (franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Build where clause
        let whereClause: Record<string, unknown> = { franchiseId }

        if (query && query.length >= 2) {
            whereClause = {
                ...whereClause,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                ],
            }
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            take: 20,
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json(clients)
    } catch (error) {
        console.error('Error searching clients:', error)
        return NextResponse.json({ error: 'Failed to search clients' }, { status: 500 })
    }
}
