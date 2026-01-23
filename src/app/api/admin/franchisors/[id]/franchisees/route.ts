import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/franchisors/[id]/franchisees
 * Returns all franchisees (businesses/LLCs) under a brand franchisor
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    const franchisorId = params.id

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get all Franchise records (LLCs) that belong to this franchisor
        const franchisees = await prisma.franchise.findMany({
            where: { franchisorId },
            include: {
                memberships: {
                    where: { isPrimary: true },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    take: 1
                },
                locations: {
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const data = franchisees.map(f => ({
            id: f.id,
            name: f.name,
            ownerName: f.memberships[0]?.user?.name || null,
            ownerEmail: f.memberships[0]?.user?.email || null,
            locationCount: f.locations.length,
            status: f.accountStatus || 'ACTIVE',
            createdAt: f.createdAt.toISOString()
        }))

        return NextResponse.json({
            success: true,
            data
        })

    } catch (error) {
        console.error('Franchisees API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
