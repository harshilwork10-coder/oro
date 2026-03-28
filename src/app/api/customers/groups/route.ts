import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Customer Groups — Wholesale, VIP, Employee pricing tiers */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    try {
        const { name, discountPercent, description, pricingType } = await req.json()
        if (!name) return NextResponse.json({ error: 'Group name required' }, { status: 400 })
        const group = await prisma.promotion.create({
            data: { franchiseId: user.franchiseId, name: `Customer Group: ${name}`, type: 'CUSTOMER_GROUP', description: description || null, discountType: 'PERCENT', discountValue: discountPercent || 0, isActive: true, appliesTo: pricingType || 'ALL', promoCode: null }
        })
        return NextResponse.json({ group })
    } catch (error: any) { console.error('[CUSTOMER_GROUP_POST]', error); return NextResponse.json({ error: 'Failed to create group' }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const groups = await prisma.promotion.findMany({ where: { franchiseId: user.franchiseId, type: 'CUSTOMER_GROUP', isActive: true }, orderBy: { name: 'asc' } })
        return NextResponse.json({ groups })
    } catch (error: any) { console.error('[CUSTOMER_GROUP_GET]', error); return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 }) }
}
