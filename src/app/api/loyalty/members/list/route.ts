import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List loyalty members for the franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''

        const skip = (page - 1) * limit

        // Build where clause
        const where: any = {
            program: {
                franchiseId: user.franchiseId
            }
        }

        if (search) {
            where.OR = [
                { phone: { contains: search } },
                { name: { contains: search } },
                { email: { contains: search } }
            ]
        }

        // Get total count
        const total = await prisma.loyaltyMember.count({ where })

        // Get members with pagination
        const members = await prisma.loyaltyMember.findMany({
            where,
            include: {
                program: {
                    select: {
                        id: true,
                        name: true,
                        franchise: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: 'desc' },
            skip,
            take: limit
        })

        return NextResponse.json({
            members,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.error('Error fetching loyalty members:', error)
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
}

