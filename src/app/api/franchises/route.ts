import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchises = await prisma.franchise.findMany({
            include: {
                _count: {
                    select: {
                        locations: true,
                        users: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(franchises)
    } catch (error) {
        console.error('Error fetching franchises:', error)
        return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, franchisorId } = body

        if (!name || !franchisorId) {
            return NextResponse.json({ error: 'Name and Franchisor ID are required' }, { status: 400 })
        }

        const franchise = await prisma.franchise.create({
            data: {
                name,
                franchisorId
            }
        })

        return NextResponse.json(franchise, { status: 201 })
    } catch (error) {
        console.error('Error creating franchise:', error)
        return NextResponse.json({ error: 'Failed to create franchise' }, { status: 500 })
    }
}
