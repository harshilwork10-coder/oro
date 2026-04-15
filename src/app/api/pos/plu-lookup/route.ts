import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PLU Lookup — Product lookup by PLU number, barcode, SKU, or name
 * GET /api/pos/plu-lookup?plu=4011 or ?q=banana
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const plu = searchParams.get('plu')?.trim()
    const q = searchParams.get('q')?.trim()

    if (!plu && !q) return NextResponse.json({ error: 'plu or q param required' }, { status: 400 })

    try {
        const products = await prisma.product.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                OR: [
                    ...(plu ? [
                        { plu: plu },
                        { barcode: plu },
                        { sku: plu }
                    ] : []),
                    ...(q ? [
                        { plu: { contains: q } },
                        { barcode: { contains: q } },
                        { name: { contains: q, mode: 'insensitive' as any } },
                        { sku: { contains: q } }
                    ] : [])
                ]
            },
            select: {
                id: true, name: true, price: true, cost: true,
                barcode: true, sku: true, plu: true, category: true,
                stock: true, soldByWeight: true, pricePerUnit: true,
                unitOfMeasure: true, ageRestricted: true, minimumAge: true,
                wicEligible: true, ebtEligible: true, isActive: true
            },
            take: 20,
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({
            results: products.map(p => ({
                ...p,
                price: Number(p.price),
                cost: p.cost ? Number(p.cost) : null,
                pricePerUnit: p.pricePerUnit ? Number(p.pricePerUnit) : null,
                requiresScale: p.soldByWeight || false,
                requiresAgeCheck: p.ageRestricted || false
            })),
            count: products.length,
            query: plu || q
        })
    } catch (error: any) {
        console.error('[PLU_LOOKUP_GET]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
