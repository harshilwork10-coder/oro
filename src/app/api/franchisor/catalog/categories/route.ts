import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET: List brand categories
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchisor (via role assignment OR direct ownership)
        // Check role assignment first, then direct ownership
        const franchisorId = user?.roleAssignments?.[0]?.franchisorId || user?.franchisor?.id
        if (!franchisorId) {
            return NextResponse.json({ error: 'Not a franchisor' }, { status: 403 })
        }

        const categories = await prisma.globalServiceCategory.findMany({
            where: { franchisorId },
            orderBy: { sortOrder: 'asc' }
        })

        return NextResponse.json({ categories })

    } catch (error) {
        console.error('Error fetching brand categories:', error)
        return NextResponse.json({ error: 'Failed to fetch brand categories' }, { status: 500 })
    }
}

// POST: Create brand category
export async function POST(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's franchisor (via role assignment OR direct ownership)
        // Check role assignment first, then direct ownership
        const franchisorId = user?.roleAssignments?.[0]?.franchisorId || user?.franchisor?.id
        if (!franchisorId) {
            return NextResponse.json({ error: 'Not a franchisor' }, { status: 403 })
        }

        const body = await req.json()
        const { name, sortOrder = 0 } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Get max sort order if not provided
        let finalSortOrder = sortOrder
        if (sortOrder === 0) {
            const maxCategory = await prisma.globalServiceCategory.findFirst({
                where: { franchisorId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true }
            })
            finalSortOrder = (maxCategory?.sortOrder || 0) + 1
        }

        const category = await prisma.globalServiceCategory.create({
            data: {
                franchisorId,
                name,
                sortOrder: finalSortOrder
            }
        })

        return NextResponse.json({ category }, 201)

    } catch (error) {
        console.error('Error creating brand category:', error)
        return NextResponse.json({ error: 'Failed to create brand category' }, { status: 500 })
    }
}
