import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET: Search clients
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('query')
        const franchiseId = searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
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
