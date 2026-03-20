import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch pricing rules for the franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rules = await prisma.pricingRule.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ rules })
    } catch (error) {
        console.error('[PRICING_RULES]', error)
        return NextResponse.json({ rules: [] })
    }
}

// POST - Create a new pricing rule
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const rule = await prisma.pricingRule.create({
            data: {
                ...body,
                franchiseId: user.franchiseId
            }
        })

        return NextResponse.json({ rule })
    } catch (error) {
        console.error('[PRICING_RULES_CREATE]', error)
        return NextResponse.json({ error: 'Failed to create pricing rule' }, { status: 500 })
    }
}

// PUT - Update a pricing rule
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const body = await request.json()
        const rule = await prisma.pricingRule.update({
            where: { id, franchiseId: user.franchiseId },
            data: body
        })

        return NextResponse.json({ rule })
    } catch (error) {
        console.error('[PRICING_RULES_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update pricing rule' }, { status: 500 })
    }
}

// DELETE - Delete a pricing rule
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        await prisma.pricingRule.delete({
            where: { id, franchiseId: user.franchiseId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[PRICING_RULES_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete pricing rule' }, { status: 500 })
    }
}
