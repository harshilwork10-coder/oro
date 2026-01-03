'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all items with filtering
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') // SERVICE, PRODUCT, MENU_ITEM, PACKAGE
        const categoryId = searchParams.get('categoryId')
        const search = searchParams.get('search')
        const activeOnly = searchParams.get('activeOnly') !== 'false'
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const items = await prisma.item.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                ...(type && { type }),
                ...(categoryId && { categoryId }),
                ...(activeOnly && { isActive: true }),
                ...(search && {
                    OR: [
                        { name: { contains: search } },
                        { barcode: { contains: search } },
                        { sku: { contains: search } },
                        { description: { contains: search } },
                    ]
                })
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        icon: true
                    }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
            take: limit,
            skip: offset
        })

        // Get total count for pagination
        const total = await prisma.item.count({
            where: {
                franchiseId: session.user.franchiseId,
                ...(type && { type }),
                ...(categoryId && { categoryId }),
                ...(activeOnly && { isActive: true })
            }
        })

        return NextResponse.json({
            items,
            total,
            limit,
            offset
        })

    } catch (error) {
        console.error('Error fetching items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}

// POST - Create a new item
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            // Required
            name,
            price,
            type = 'PRODUCT',

            // Optional - Universal
            description,
            categoryId,
            imageUrl,
            sortOrder,
            isActive,

            // Service fields
            duration,
            requiresDeposit,
            depositAmount,

            // Product fields
            barcode,
            sku,
            stock,
            cost,
            reorderPoint,
            brand,
            size,

            // Restaurant fields
            preparationTime,
            calories,
            allergens,

            // Compliance
            ageRestricted,
            minimumAge,
            isEbtEligible,
            isTobacco,
            isAlcohol,

            // Tax
            taxExempt,
            taxRate
        } = body

        // Validate required fields
        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
        }

        // Validate type
        const validTypes = ['SERVICE', 'PRODUCT', 'MENU_ITEM', 'PACKAGE']
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
        }

        const item = await prisma.item.create({
            data: {
                franchiseId: session.user.franchiseId,
                name,
                price,
                type,
                description,
                categoryId,
                imageUrl,
                sortOrder: sortOrder || 0,
                isActive: isActive !== false,

                // Service
                duration,
                requiresDeposit: requiresDeposit || false,
                depositAmount,

                // Product
                barcode,
                sku,
                stock,
                cost,
                reorderPoint,
                brand,
                size,

                // Restaurant
                preparationTime,
                calories,
                allergens,

                // Compliance
                ageRestricted: ageRestricted || false,
                minimumAge,
                isEbtEligible: isEbtEligible || false,
                isTobacco: isTobacco || false,
                isAlcohol: isAlcohol || false,

                // Tax
                taxExempt: taxExempt || false,
                taxRate
            },
            include: {
                category: true
            }
        })

        return NextResponse.json(item, { status: 201 })

    } catch (error) {
        console.error('Error creating item:', error)
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }
}

