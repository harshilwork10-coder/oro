import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/** Price Match — Manager approves competitive price match */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
    try {
        const { itemId, competitorName, competitorPrice, proof } = await req.json()
        if (!itemId || !competitorPrice) return NextResponse.json({ error: 'itemId and competitorPrice required' }, { status: 400 })
        const item = await prisma.item.findFirst({ where: { id: itemId, franchiseId: user.franchiseId } })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        const ourPrice = Number(item.price), theirPrice = Number(competitorPrice)
        if (theirPrice >= ourPrice) return NextResponse.json({ matched: false, message: `Our price ($${ourPrice.toFixed(2)}) is already lower` })
        const discount = ourPrice - theirPrice
        await logActivity({ userId: user.id, userEmail: user.email, userRole: user.role, franchiseId: user.franchiseId, action: 'PRICE_MATCH', entityType: 'Item', entityId: itemId, details: { oldPrice: ourPrice, matchedPrice: theirPrice, competitor: competitorName || 'Competitor', proof } })
        return NextResponse.json({ matched: true, itemName: item.name, ourPrice, matchedPrice: theirPrice, discount: Math.round(discount * 100) / 100, competitor: competitorName || 'Competitor', message: `Price matched! Apply $${discount.toFixed(2)} discount at checkout.` })
    } catch (error: any) { console.error('[PRICE_MATCH_POST]', error); return NextResponse.json({ error: 'Failed to process price match' }, { status: 500 }) }
}
