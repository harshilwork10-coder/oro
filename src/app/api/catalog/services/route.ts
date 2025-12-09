import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'FRANCHISOR' && session.user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // In a real app, we'd filter by the specific Franchisor ID linked to the user
        // For now, assuming the user is an owner/admin of a Franchisor
        const globalServices = await prisma.globalService.findMany({
            where: { isArchived: false },
            include: {
                _count: {
                    select: { localInstances: true }
                }
            }
        })

        return NextResponse.json(globalServices)
    } catch (error) {
        console.error('Error fetching global services:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id || (user.role !== 'FRANCHISOR' && user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, description, duration, defaultPrice, category, franchisorId } = body

        if (!name || !defaultPrice || !franchisorId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Security: Verify user owns this franchisor or is PROVIDER
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: { ownerId: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        if (franchisor.ownerId !== user.id && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const newService = await prisma.globalService.create({
            data: {
                name,
                description,
                duration: parseInt(duration),
                defaultPrice: parseFloat(defaultPrice),
                category,
                franchisorId
            }
        })

        return NextResponse.json(newService)
    } catch (error) {
        console.error('Error creating global service:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
