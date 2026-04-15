import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Search products by name, barcode, or SKU
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') || ''
        const limit = parseInt(searchParams.get('limit') || '10')

        if (q.length < 2) {
            return NextResponse.json({ data: [] })
        }

        const where: any = {
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { barcode: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } }
            ]
        }
        if (user.franchiseId) where.franchiseId = user.franchiseId

        const products = await prisma.product.findMany({
            where,
            take: limit,
            select: {
                id: true,
                name: true,
                price: true,
                barcode: true,
                sku: true,
                quantity: true,
                category: { select: { name: true } },
                location: { select: { name: true } }
            }
        })

        const data = products.map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            barcode: p.barcode,
            sku: p.sku,
            quantity: p.quantity,
            categoryName: p.category?.name,
            locationName: p.location?.name
        }))

        return NextResponse.json({ data })
    } catch (error) {
        console.error('[PRODUCTS_SEARCH]', error)
        return NextResponse.json({ data: [] })
    }
}
