// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PLU Lookup API
 * 
 * Used at POS when cashier types a PLU number (4-5 digits)
 * Common PLU codes: 4011 = Banana, 4065 = Pepper, 4225 = Avocado
 * 
 * Also handles internal PLU from price-embedded barcodes (prefix-2)
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(request.url)
        const plu = searchParams.get('plu')?.trim()
        const q = searchParams.get('q')?.trim()  // general search

        if (!plu && !q) {
            return NextResponse.json({ error: 'plu or q param required' }, { status: 400 })
        }

        // Search by PLU, barcode, sku, or name
        const products = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true,
                OR: [
                    ...(plu ? [
                        { plu: plu },
                        { barcode: plu },
                        { sku: plu },
                    ] : []),
                    ...(q ? [
                        { plu: { contains: q } },
                        { barcode: { contains: q } },
                        { name: { contains: q, mode: 'insensitive' as any } },
                        { sku: { contains: q } },
                    ] : []),
                ],
            },
            select: {
                id: true,
                name: true,
                price: true,
                cost: true,
                barcode: true,
                sku: true,
                plu: true,
                category: true,
                stock: true,
                soldByWeight: true,
                pricePerUnit: true,
                unitOfMeasure: true,
                ageRestricted: true,
                minimumAge: true,
                wicEligible: true,
                ebtEligible: true,
                isActive: true,
            },
            take: 20,
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({
            results: products.map(p => ({
                ...p,
                price: Number(p.price),
                cost: p.cost ? Number(p.cost) : null,
                pricePerUnit: p.pricePerUnit ? Number(p.pricePerUnit) : null,
                requiresScale: p.soldByWeight || false,
                requiresAgeCheck: p.ageRestricted || false,
            })),
            count: products.length,
            query: plu || q,
        })

    } catch (error) {
        console.error('PLU Lookup error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
