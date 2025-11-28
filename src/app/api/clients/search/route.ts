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

        if (!query || !franchiseId) {
            return NextResponse.json({ error: 'Query and franchise ID required' }, { status: 400 })
        }

        const clients = await prisma.client.findMany({
            where: {
                franchiseId,
                OR: [
                    { firstName: { contains: query } },
                    { lastName: { contains: query } },
                    { email: { contains: query } },
                    { phone: { contains: query } },
                ],
            },
            take: 10,
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
