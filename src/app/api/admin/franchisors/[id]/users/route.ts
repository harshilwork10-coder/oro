import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/franchisors/[id]/users
 * Get all users associated with a franchisor's franchises
 * Used for Pulse seat assignment
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if ((session.user as any).role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { id } = await params

        // Get the franchisor with their franchises and users
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            include: {
                owner: true,
                franchises: {
                    include: {
                        users: true
                    }
                }
            }
        }) as any

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Collect all users: owner + franchise users
        const allUsers: Array<{
            id: string
            name: string | null
            email: string
            role: string
            hasPulseAccess: boolean
            isOwner: boolean
        }> = []

        // Add owner first
        if (franchisor.owner) {
            allUsers.push({
                id: franchisor.owner.id,
                name: franchisor.owner.name,
                email: franchisor.owner.email,
                role: franchisor.owner.role,
                hasPulseAccess: franchisor.owner.hasPulseAccess || false,
                isOwner: true
            })
        }

        // Add franchise users (excluding duplicates)
        const seenIds = new Set([franchisor.owner?.id])
        for (const franchise of franchisor.franchises) {
            for (const user of franchise.users) {
                if (!seenIds.has(user.id)) {
                    seenIds.add(user.id)
                    allUsers.push({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        hasPulseAccess: user.hasPulseAccess || false,
                        isOwner: false
                    })
                }
            }
        }

        return NextResponse.json({ users: allUsers })
    } catch (error) {
        console.error('Error fetching franchisor users:', error)
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}
