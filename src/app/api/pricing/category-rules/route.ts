import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch category-level pricing rules
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rules = await prisma.pricingRule.findMany({
            where: {
                franchiseId: user.franchiseId,
                scope: 'CATEGORY'
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ rules })
    } catch (error) {
        console.error('[PRICING_CATEGORY_RULES]', error)
        return NextResponse.json({ rules: [] })
    }
}

// POST - Create a category pricing rule
export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const rule = await prisma.pricingRule.create({
            data: {
                ...body,
                scope: 'CATEGORY',
                franchiseId: user.franchiseId
            }
        })

        return NextResponse.json({ rule })
    } catch (error) {
        console.error('[PRICING_CATEGORY_RULES_CREATE]', error)
        return NextResponse.json({ error: 'Failed to create category rule' }, { status: 500 })
    }
}
