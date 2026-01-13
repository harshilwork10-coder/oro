import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// GET - List products with pagination, search, and filters
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
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)

        // Filters
        const search = searchParams.get('search')
        const categoryId = searchParams.get('categoryId')
        const departmentId = searchParams.get('departmentId')
        const tobaccoFilter = searchParams.get('tobacco')
        const lowStock = searchParams.get('lowStock')

        // Build where clause
        const whereClause: Record<string, unknown> = {
            franchiseId: user.franchiseId,
            isActive: true
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { barcode: { contains: search } },
                { sku: { contains: search } }
            ]
        }

        if (categoryId) whereClause.categoryId = categoryId
        if (departmentId) whereClause.departmentId = departmentId
        if (tobaccoFilter === 'true') whereClause.isTobacco = true
        if (lowStock === 'true') {
            whereClause.stock = { lte: prisma.product.fields.reorderPoint || 10 }
        }

        // Build query args with cursor pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1, // Fetch extra to check hasMore
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
            orderBy: orderBy || { name: 'asc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const products = await prisma.product.findMany(queryArgs as Parameters<typeof prisma.product.findMany>[0])

        const hasMore = products.length > take
        const data = hasMore ? products.slice(0, take) : products
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('[INVENTORY_PRODUCTS_GET]', error)
        return ApiResponse.serverError('Failed to fetch products')
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
        const { name, barcode, sku, price, cashPrice, cost, stock, reorderPoint, categoryId, vendor, unitsPerCase, casePrice, sellByCase } = body

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

        // Get franchise config for dual pricing settings
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: {
                franchisor: {
                    include: { config: true }
                }
            }
        })

        // Determine cash price (use cashPrice if provided, else fall back to price)
        const baseCashPrice = parseFloat(cashPrice ?? price) || 0

        // Calculate card price if dual pricing is enabled
        let calculatedCardPrice: number | null = null
        // Cast config as any since Prisma types may be stale after schema changes
        const config = franchise?.franchisor?.config as any
        if (config?.pricingModel === 'DUAL_PRICING') {
            const percentage = parseFloat(String(config.cardSurcharge)) || 0
            // Formula: cardPrice = cashPrice × (1 + percentage/100)
            calculatedCardPrice = baseCashPrice * (1 + percentage / 100)
        }

        const product = await prisma.product.create({
            // Cast data as any since Prisma types may be stale after schema changes
            data: {
                name: name.trim(),
                barcode: barcode?.trim() || null,
                sku: sku?.trim() || null,
                price: baseCashPrice, // Legacy field - keep in sync with cashPrice
                cashPrice: baseCashPrice,
                cardPrice: calculatedCardPrice,
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
            } as any,
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

