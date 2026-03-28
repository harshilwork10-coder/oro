import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch locations owned by the current franchisee
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'FRANCHISEE') {
            return NextResponse.json({ error: 'Unauthorized - Franchisee only' }, { status: 401 })
        }

        // Get locations where this user is the owner
        const locations = await prisma.location.findMany({
            where: {
                ownerId: user.id
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

