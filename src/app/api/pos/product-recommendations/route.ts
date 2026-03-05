/**
 * Product Recommendations API
 * POST /api/pos/product-recommendations
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const body = await req.json()
        const { serviceNames = [] } = body

        const products = await prisma.product.findMany({
            where: { franchiseId, isActive: true, stock: { gt: 0 } },
            select: {
                id: true, name: true, price: true, stock: true, description: true,
                categoryId: true
            },
            orderBy: { name: 'asc' },
            take: 50
        })

        // Batch-fetch category names
        const catIds = [...new Set(products.map(p => p.categoryId).filter(Boolean) as string[])]
        const categories = catIds.length ? await prisma.productCategory.findMany({
            where: { id: { in: catIds } },
            select: { id: true, name: true }
        }) : []
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name || '']))

        const serviceKeywords = serviceNames.flatMap((s: string) => s.toLowerCase().split(/[\s,]+/))

        const recommendations = products
            .map(p => {
                let matchScore = 50
                const pName = p.name.toLowerCase()
                const pDesc = (p.description || '').toLowerCase()
                const pCat = (p.categoryId ? catMap[p.categoryId] || '' : '').toLowerCase()

                serviceKeywords.forEach((kw: string) => {
                    if (pName.includes(kw) || pDesc.includes(kw) || pCat.includes(kw)) matchScore += 15
                })
                if (serviceKeywords.some((k: string) => ['hair', 'cut', 'color', 'highlight', 'balayage'].includes(k))) {
                    if (pCat.includes('hair') || pName.includes('shampoo') || pName.includes('conditioner')) matchScore += 20
                }
                if (serviceKeywords.some((k: string) => ['facial', 'skin', 'peel'].includes(k))) {
                    if (pCat.includes('skin') || pName.includes('serum') || pName.includes('moistur')) matchScore += 20
                }
                return {
                    id: p.id, name: p.name, price: Number(p.price),
                    reason: matchScore > 70 ? 'Frequently paired with this service' : matchScore > 60 ? 'Recommended for at-home care' : 'Popular retail item',
                    matchScore: Math.min(99, matchScore),
                    inStock: (p.stock || 0) > 0
                }
            })
            .filter(r => r.matchScore >= 50)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 8)

        return NextResponse.json({ success: true, data: recommendations })
    } catch (error) {
        console.error('[PRODUCT_RECO_POST]', error)
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
    }
})
