import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Search products by name, barcode, or SKU
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

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query || query.length < 2) {
            return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
        }

        // Search by name, SKU, or category
        // Note: barcode field will work after prisma generate is run
        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    { name: { contains: query } },
                    { sku: { contains: query } },
                    { category: { contains: query } }
                ]
            },
            select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                stock: true,
                category: true
            },
            take: 50,
            orderBy: { name: 'asc' }
        })

        // Add placeholder fields for barcode/age until prisma is regenerated
        const productsWithRetailFields = products.map(p => ({
            ...p,
            barcode: (p as any).barcode || null,
            ageRestricted: (p as any).ageRestricted || false,
            minimumAge: (p as any).minimumAge || null,
            // Case break fields
            unitsPerCase: (p as any).unitsPerCase || null,
            casePrice: (p as any).casePrice || null,
            sellByCase: (p as any).sellByCase || false
        }))

        return NextResponse.json(productsWithRetailFields)
    } catch (error) {
        console.error('[RETAIL_SEARCH]', error)
        return NextResponse.json({ error: 'Failed to search products' }, { status: 500 })
    }
}

