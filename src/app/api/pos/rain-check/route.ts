import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Rain Check — Issue and list rain checks */
export async function POST(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { itemId, customerName, customerPhone, salePrice, quantity, expiresInDays } = await req.json()
        if (!itemId || !salePrice) return NextResponse.json({ error: 'itemId and salePrice required' }, { status: 400 })
        const item = await prisma.item.findFirst({ where: { id: itemId, franchiseId: user.franchiseId } })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        const code = 'RC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase()
        const rainCheck = await prisma.promotion.create({
            data: {
                franchiseId: user.franchiseId, name: `Rain Check: ${item.name}`,
                description: JSON.stringify({ itemId, itemName: item.name, customerName, customerPhone, salePrice, quantity: quantity || 1, issuedBy: user.name || user.email }),
                type: 'RAIN_CHECK', discountType: 'FIXED', discountValue: Number(item.price) - salePrice,
                promoCode: code, startDate: new Date(), endDate: new Date(Date.now() + (expiresInDays || 30) * 86400000),
                maxUsesPerTransaction: 1, isActive: true, appliesTo: 'SPECIFIC_ITEM',
                qualifyingItems: { create: [{ productId: itemId }] }
            }
        })
        return NextResponse.json({ rainCheck: { code, itemName: item.name, salePrice, expiresAt: rainCheck.endDate, id: rainCheck.id } })
    } catch (error: any) { console.error('[RAIN_CHECK_POST]', error); return NextResponse.json({ error: 'Failed to issue rain check' }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const rainChecks = await prisma.promotion.findMany({ where: { franchiseId: user.franchiseId, type: 'RAIN_CHECK', isActive: true, endDate: { gte: new Date() } }, orderBy: { createdAt: 'desc' } })
        return NextResponse.json({ rainChecks })
    } catch (error: any) { console.error('[RAIN_CHECK_GET]', error); return NextResponse.json({ error: 'Failed to fetch rain checks' }, { status: 500 }) }
}
