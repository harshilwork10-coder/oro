import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET - Search products by name, barcode, or SKU with standardized response
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const searchParams = req.nextUrl.searchParams
        const query = searchParams.get('q')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const categoryId = searchParams.get('categoryId')
        const inStockOnly = searchParams.get('inStockOnly') === 'true'

        if (!query || query.length < 2) {
            return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 422 })
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true,
            OR: [
                { name: { contains: query } },
                { sku: { contains: query } },
                { category: { contains: query } },
                { barcode: { contains: query } }
            ]
        }

        if (categoryId) {
            whereClause.categoryId = categoryId
        }

        if (inStockOnly) {
            whereClause.stock = { gt: 0 }
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                barcode: true,
                stock: true,
                category: true,
                productCategory: {
                    select: {
                        ageRestricted: true,
                        minimumAge: true
                    }
                },
                unitsPerCase: true,
                casePrice: true,
                sellByCase: true
            },
            take: limit,
            orderBy: { name: 'asc' }
        })

        // Transform for retail fields
        const productsWithRetailFields = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            sku: p.sku,
            barcode: p.barcode,
            stock: p.stock,
            category: p.category,
            ageRestricted: p.productCategory?.ageRestricted || false,
            minimumAge: p.productCategory?.minimumAge || null,
            unitsPerCase: p.unitsPerCase,
            casePrice: p.casePrice,
            sellByCase: p.sellByCase
        }))

        return NextResponse.json(productsWithRetailFields)
    } catch (error) {
        console.error('[RETAIL_SEARCH]', error)
        return NextResponse.json({ error: 'Failed to search products' }, { status: 500 })
    }
}
