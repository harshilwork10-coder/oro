import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET - List inventory items for POS (offline sync, search, barcode lookup)
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
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search')
        const barcode = searchParams.get('barcode')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }

        // Barcode lookup (exact match)
        if (barcode) {
            whereClause.barcode = barcode
        }

        // Search (name, barcode, sku)
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
                { sku: { contains: search } }
            ]
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            take: Math.min(limit, 10000), // Cap at 10000 for safety
            select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                price: true,
                cashPrice: true,
                cardPrice: true,
                cost: true,
                stock: true,
                reorderPoint: true,
                category: true,
                categoryId: true,
                isTobacco: true,
                isEbtEligible: true,
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
                unitsPerCase: true,
                casePrice: true,
                sellByCase: true,
                stockCases: true
            },
            orderBy: { name: 'asc' }
        } as Parameters<typeof prisma.product.findMany>[0])

        // Return { items: [...] } format for offline sync compatibility
        return Response.json({ items: products })
    } catch (error) {
        console.error('[INVENTORY_ITEMS_GET]', error)
        return ApiResponse.serverError('Failed to fetch items')
    }
}
