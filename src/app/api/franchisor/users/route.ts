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
        // Get the franchisor owner via ownerId
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: { ownerId: true }
        })
        const ownerUser = franchisor?.ownerId
            ? await prisma.user.findUnique({
                where: { id: franchisor.ownerId },
                select: { id: true, name: true, email: true, role: true, isActive: true }
            })
            : null

        // Get all users from franchises under this franchisor
        const franchiseIds = (await prisma.franchise.findMany({
            where: { franchisorId },
            select: { id: true, name: true }
        }))

        const franchiseUsers = await prisma.user.findMany({
            where: { franchiseId: { in: franchiseIds.map(f => f.id) } },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                franchiseId: true
            }
        })

        // Combine and dedupe users
        const userMap = new Map<string, any>()

        // Add franchisor owner
        if (ownerUser) {
            userMap.set(ownerUser.id, {
                ...ownerUser,
                context: 'Brand HQ'
            })
        }

        // Add franchise users
        franchiseUsers.forEach(u => {
            if (!userMap.has(u.id)) {
                const franchise = franchiseIds.find(f => f.id === u.franchiseId)
                userMap.set(u.id, {
                    ...u,
                    context: franchise?.name || 'Franchise'
                })
            }
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
