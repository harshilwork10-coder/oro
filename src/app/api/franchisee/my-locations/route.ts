import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch locations owned by the current franchisee
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (user.role !== 'FRANCHISEE') {
            return NextResponse.json({ error: 'Unauthorized - Franchisee only' }, { status: 401 })
        }

        // Resolve the real franchiseId (skip sentinel values)
        const franchiseId = user.franchiseId && !user.franchiseId.startsWith('__') ? user.franchiseId : null
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise linked to account' }, { status: 404 })
        }

        // Get locations for this franchisee's franchise
        const locations = await prisma.location.findMany({
            where: {
                franchiseId: franchiseId
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
