import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET - List inventory items for POS (offline sync, search, barcode lookup)
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const searchParams = req.nextUrl.searchParams
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
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}
