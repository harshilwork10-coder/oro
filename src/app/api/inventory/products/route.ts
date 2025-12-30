import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all products with category info for inventory management
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

        // Check for tobacco filter
        const searchParams = request.nextUrl.searchParams
        const tobaccoFilter = searchParams.get('tobacco')

        const whereClause: any = {
            franchiseId: user.franchiseId,
            isActive: true
        }

        // If tobacco=true, only return tobacco products
        if (tobaccoFilter === 'true') {
            whereClause.isTobacco = true
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cost: true,
                stock: true,
                reorderPoint: true,
                category: true,
                categoryId: true,
                isTobacco: true,
                productCategory: {
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true,
                        isEbtEligible: true
                    }
                },
                vendor: true,
                isActive: true,
                // Case break fields
                unitsPerCase: true,
                casePrice: true,
                sellByCase: true,
                stockCases: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ products })
    } catch (error) {
        console.error('[INVENTORY_PRODUCTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}

// POST - Create new product
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
        const { name, barcode, sku, price, cost, stock, reorderPoint, categoryId, vendor, unitsPerCase, casePrice, sellByCase } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Check for duplicate barcode
        if (barcode) {
            const existing = await prisma.product.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    barcode: barcode
                }
            })
            if (existing) {
                return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
            }
        }

        const product = await prisma.product.create({
            data: {
                name: name.trim(),
                barcode: barcode?.trim() || null,
                sku: sku?.trim() || null,
                price: parseFloat(price) || 0,
                cost: cost ? parseFloat(cost) : null,
                stock: parseInt(stock) || 0,
                reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
                categoryId: categoryId || null,
                vendor: vendor?.trim() || null,
                // Case break fields
                unitsPerCase: unitsPerCase ? parseInt(unitsPerCase) : null,
                casePrice: casePrice ? parseFloat(casePrice) : null,
                sellByCase: sellByCase ?? false,
                franchiseId: user.franchiseId
            },
            include: {
                productCategory: {
                    select: {
                        id: true,
                        name: true,
                        ageRestricted: true,
                        minimumAge: true,
                        isEbtEligible: true
                    }
                }
            }
        })

        return NextResponse.json({ product })
    } catch (error) {
        console.error('[INVENTORY_PRODUCTS_POST]', error)
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }
}

