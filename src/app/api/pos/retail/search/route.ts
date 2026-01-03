import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET - Search products by name, barcode, or SKU with standardized response
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const user = session.user as { franchiseId?: string }
        if (!user.franchiseId) {
            return ApiResponse.error('No franchise associated', 400)
        }

        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('q')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const categoryId = searchParams.get('categoryId')
        const inStockOnly = searchParams.get('inStockOnly') === 'true'

        if (!query || query.length < 2) {
            return ApiResponse.validationError('Query must be at least 2 characters')
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

        return ApiResponse.success(productsWithRetailFields)
    } catch (error) {
        console.error('[RETAIL_SEARCH]', error)
        return ApiResponse.serverError('Failed to search products')
    }
}
