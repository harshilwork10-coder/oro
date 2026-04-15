import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (authUser.role !== 'PROVIDER' && authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let whereClause = {}

        if (authUser.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id }
            })

            if (!franchisor) {
                return NextResponse.json([])
            }

            whereClause = { franchisorId: franchisor.id }
        }

        const franchises = await prisma.franchise.findMany({
            where: whereClause,
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

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId && authUser?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (authUser.role !== 'PROVIDER' && authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        let { name, franchisorId } = body

        // If Franchisor, force their own ID
        if (authUser.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: authUser.id }
            })
            if (!franchisor) return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 404 })
            franchisorId = franchisor.id
        }

        if (!name || !franchisorId) {
            return NextResponse.json({ error: 'Name and Franchisor ID are required' }, { status: 400 })
        }

        // Generate slug
        let slug = name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '')

        // Ensure uniqueness
        let uniqueSlug = slug
        let counter = 1
        while (await prisma.franchise.findUnique({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${slug}-${counter}`
            counter++
        }

        const franchise = await prisma.franchise.create({
            data: {
                name,
                slug: uniqueSlug,
                franchisorId
            }
        })

        return NextResponse.json(franchise, { status: 201 })
    } catch (error) {
        console.error('Error creating franchise:', error)
        return NextResponse.json({ error: 'Failed to create franchise' }, { status: 500 })
    }
}
