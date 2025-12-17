import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all product categories for franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Check if any categories exist
        let categories = await prisma.productCategory.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                description: true,
                ageRestricted: true,
                minimumAge: true,
                isEbtEligible: true,
                sortOrder: true,
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { sortOrder: 'asc' }
        })

        // If no categories exist, create default ones
        if (categories.length === 0) {
            const defaultCategories = [
                { name: 'Liquor', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 1 },
                { name: 'Beer', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 2 },
                { name: 'Wine', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 3 },
                { name: 'Tobacco', ageRestricted: true, minimumAge: 21, isEbtEligible: false, sortOrder: 4 },
                { name: 'Snacks', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 5 },
                { name: 'Beverages', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 6 },
                { name: 'Candy', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 7 },
                { name: 'Grocery', ageRestricted: false, minimumAge: null, isEbtEligible: true, sortOrder: 8 },
            ]

            await prisma.productCategory.createMany({
                data: defaultCategories.map(cat => ({
                    ...cat,
                    franchiseId: user.franchiseId,
                    isActive: true
                }))
            })

            // Re-fetch the newly created categories
            categories = await prisma.productCategory.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    ageRestricted: true,
                    minimumAge: true,
                    isEbtEligible: true,
                    sortOrder: true,
                    _count: {
                        select: { products: true }
                    }
                },
                orderBy: { sortOrder: 'asc' }
            })
        }

        return NextResponse.json({ categories })
    } catch (error) {
        console.error('[CATEGORIES_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
}

// POST - Create new product category
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const body = await request.json()
        const { name, description, ageRestricted, minimumAge, departmentId, isEbtEligible } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Get max sortOrder for new category
        const maxSort = await prisma.productCategory.aggregate({
            where: { franchiseId: user.franchiseId },
            _max: { sortOrder: true }
        })

        const category = await prisma.productCategory.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ageRestricted: ageRestricted || false,
                minimumAge: ageRestricted ? (minimumAge || 21) : null,
                isEbtEligible: isEbtEligible || false,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
                franchiseId: user.franchiseId,
                departmentId: departmentId || null  // Link to parent department
            }
        })

        return NextResponse.json({ category })
    } catch (error) {
        console.error('[CATEGORIES_POST]', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}
