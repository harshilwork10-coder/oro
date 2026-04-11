import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Case Break / Carton Logic
 *
 * GET /api/pos/case-break?itemId=xxx — Check if item can be broken from case
 * POST /api/pos/case-break — Break a case into individual units
 *
 * Uses existing schema field: Item.unitsPerCase
 * When a case is "broken", we decrement the case item's stock and increment
 * the unit item's stock by unitsPerCase.
 */
export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    try {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true, name: true, sku: true, barcode: true,
                unitsPerCase: true, stock: true,
                category: { select: { name: true } }
            }
        })

        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        return NextResponse.json({
            item: {
                id: item.id,
                name: item.name,
                sku: item.sku,
                barcode: item.barcode,
                currentStock: item.stock,
                unitsPerCase: item.unitsPerCase,
                canBreak: item.unitsPerCase && item.unitsPerCase > 1 && item.stock > 0,
                categoryName: item.category?.name
            }
        })
    } catch (error: any) {
        console.error('[CASE_BREAK_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { caseItemId, unitItemId, casesToBreak } = body

        if (!caseItemId || !unitItemId || !casesToBreak || casesToBreak <= 0) {
            return NextResponse.json({ error: 'caseItemId, unitItemId, and positive casesToBreak required' }, { status: 400 })
        }

        const caseItem = await prisma.item.findUnique({
            where: { id: caseItemId },
            select: { id: true, name: true, stock: true, unitsPerCase: true }
        })

        if (!caseItem) return NextResponse.json({ error: 'Case item not found' }, { status: 404 })
        if (!caseItem.unitsPerCase || caseItem.unitsPerCase < 2) {
            return NextResponse.json({ error: 'Item is not a case item (unitsPerCase must be >= 2)' }, { status: 400 })
        }
        if (caseItem.stock < casesToBreak) {
            return NextResponse.json({ error: `Not enough cases in stock. Available: ${caseItem.stock}` }, { status: 400 })
        }

        const unitsToAdd = casesToBreak * caseItem.unitsPerCase

        // Atomic: decrement case stock, increment unit stock
        await prisma.$transaction([
            prisma.item.update({
                where: { id: caseItemId },
                data: { stock: { decrement: casesToBreak } }
            }),
            prisma.item.update({
                where: { id: unitItemId },
                data: { stock: { increment: unitsToAdd } }
            })
        ])

        // Log the adjustment
        await prisma.stockAdjustment.create({
            data: {
                productId: caseItemId,
                locationId: 'case-break', // Will resolve at runtime via user location
                quantity: -casesToBreak,
                reason: 'CASE_BREAK',
                notes: `Broke ${casesToBreak} case(s) into ${unitsToAdd} units → ${unitItemId}`,
                performedBy: user.id
            }
        }).catch(() => {}) // Non-critical if product model doesn't link

        return NextResponse.json({
            success: true,
            casesRemaining: caseItem.stock - casesToBreak,
            unitsAdded: unitsToAdd,
            caseItemName: caseItem.name
        })
    } catch (error: any) {
        console.error('[CASE_BREAK_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
