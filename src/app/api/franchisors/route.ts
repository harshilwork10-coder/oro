import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can view all franchisors
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const franchisors = await prisma.franchisor.findMany({
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        franchises: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(franchisors)
    } catch (error) {
        console.error('Error fetching franchisors:', error)
        return NextResponse.json(
            { error: 'Failed to fetch franchisors' },
            { status: 500 }
        )
    }
}
