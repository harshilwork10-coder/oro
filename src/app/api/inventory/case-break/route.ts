import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Case Break — Convert cases into singles
 * POST /api/inventory/case-break
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId || !user.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { caseItemId, singleItemId, caseQty, unitsPerCase } = await req.json()

        if (!caseItemId || !singleItemId || !caseQty || !unitsPerCase) {
            return NextResponse.json({ error: 'caseItemId, singleItemId, caseQty, unitsPerCase required' }, { status: 400 })
        }

        const caseItem = await prisma.item.findFirst({ where: { id: caseItemId, franchiseId: user.franchiseId } })
        const singleItem = await prisma.item.findFirst({ where: { id: singleItemId, franchiseId: user.franchiseId } })

        if (!caseItem || !singleItem) return NextResponse.json({ error: 'Item(s) not found' }, { status: 404 })
        if ((caseItem.stock || 0) < caseQty) return NextResponse.json({ error: `Only ${caseItem.stock} cases in stock` }, { status: 400 })

        const singlesAdded = caseQty * unitsPerCase

        await prisma.$transaction([
            prisma.item.update({ where: { id: caseItemId }, data: { stock: { decrement: caseQty } } }),
            prisma.item.update({ where: { id: singleItemId }, data: { stock: { increment: singlesAdded } } }),
            prisma.stockAdjustment.create({
                data: {
                    locationId: user.locationId, itemId: caseItemId, quantity: -caseQty,
                    reason: 'CASE_BREAK', notes: `Broke ${caseQty} case(s) into ${singlesAdded} singles`,
                    adjustedBy: user.id
                }
            }),
            prisma.stockAdjustment.create({
                data: {
                    locationId: user.locationId, itemId: singleItemId, quantity: singlesAdded,
                    reason: 'CASE_BREAK', notes: `Received ${singlesAdded} singles from ${caseQty} case(s)`,
                    adjustedBy: user.id
                }
            })
        ])

        return NextResponse.json({ casesUsed: caseQty, singlesAdded, caseItemName: caseItem.name, singleItemName: singleItem.name })
    } catch (error: any) {
        console.error('[CASE_BREAK_POST]', error)
        return NextResponse.json({ error: 'Failed to break case' }, { status: 500 })
    }
}
