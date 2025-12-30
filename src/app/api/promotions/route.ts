import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all promotions for franchise
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
        const activeOnly = searchParams.get('active') !== 'false'

        const promotions = await prisma.promotion.findMany({
            where: {
                franchiseId: user.franchiseId,
                ...(activeOnly ? { isActive: true } : {})
            },
            include: {
                qualifyingItems: true
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json({ promotions })
    } catch (error) {
        console.error('[PROMOTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
    }
}

// POST - Create a new promotion
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Only managers and owners can create promotions
        if (!['ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            description,
            type,
            discountType,
            discountValue,
            requiredQty,
            getQty,
            minSpend,
            priceTiers,
            startDate,
            endDate,
            timeStart,
            timeEnd,
            daysOfWeek,
            appliesTo,
            stackable,
            priority,
            maxUsesPerTransaction,
            promoCode,
            qualifyingItems // Array of { categoryId?, productId?, isExcluded? }
        } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Promotion name is required' }, { status: 400 })
        }

        const promotion = await prisma.promotion.create({
            data: {
                franchiseId: user.franchiseId,
                name: name.trim(),
                description: description?.trim() || null,
                type: type || 'PERCENTAGE',
                discountType: discountType || 'PERCENT',
                discountValue: discountValue || 0,
                requiredQty: requiredQty || null,
                getQty: getQty || null,
                minSpend: minSpend || null,
                priceTiers: priceTiers || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                timeStart: timeStart || null,
                timeEnd: timeEnd || null,
                daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
                appliesTo: appliesTo || 'ALL',
                stackable: stackable || false,
                priority: priority || 0,
                maxUsesPerTransaction: maxUsesPerTransaction || null,
                promoCode: promoCode?.trim() || null,
                qualifyingItems: qualifyingItems?.length > 0 ? {
                    create: qualifyingItems.map((item: any) => ({
                        categoryId: item.categoryId || null,
                        productId: item.productId || null,
                        isExcluded: item.isExcluded || false
                    }))
                } : undefined
            },
            include: {
                qualifyingItems: true
            }
        })

        return NextResponse.json({ promotion })
    } catch (error) {
        console.error('[PROMOTIONS_POST]', error)
        return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
    }
}

// DELETE - Deactivate a promotion
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!['ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Promotion ID required' }, { status: 400 })
        }

        // Verify ownership
        const existing = await prisma.promotion.findFirst({
            where: { id, franchiseId: user.franchiseId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
        }

        // Soft delete (deactivate)
        await prisma.promotion.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[PROMOTIONS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 })
    }
}

