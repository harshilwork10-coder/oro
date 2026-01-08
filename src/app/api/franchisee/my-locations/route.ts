import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch locations owned by the current franchisee
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISEE') {
            return NextResponse.json({ error: 'Unauthorized - Franchisee only' }, { status: 401 })
        }

        // Get locations where this user is the owner
        const locations = await prisma.location.findMany({
            where: {
                ownerId: session.user.id
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        users: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(locations)

    } catch (error) {
        console.error('Error fetching franchisee locations:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

