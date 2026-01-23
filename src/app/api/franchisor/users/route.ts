import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/franchisor/users
 * Returns all users that belong to franchises under this franchisor
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchisorId = (session.user as any).franchisorId

    if (!franchisorId) {
        return NextResponse.json({ error: 'No franchisor context' }, { status: 403 })
    }

    try {
        // Get the franchisor owner
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true
                    }
                }
            }
        })

        // Get all users from franchises under this franchisor
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true
                    }
                }
            }
        })

        // Combine and dedupe users
        const userMap = new Map<string, any>()

        // Add franchisor owner
        if (franchisor?.owner) {
            userMap.set(franchisor.owner.id, {
                ...franchisor.owner,
                context: 'Brand HQ'
            })
        }

        // Add franchise users
        franchises.forEach(f => {
            f.users.forEach(u => {
                if (!userMap.has(u.id)) {
                    userMap.set(u.id, {
                        ...u,
                        context: f.name
                    })
                }
            })
        })

        const users = Array.from(userMap.values())

        return NextResponse.json({
            success: true,
            data: users
        })

    } catch (error) {
        console.error('Franchisor users API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
