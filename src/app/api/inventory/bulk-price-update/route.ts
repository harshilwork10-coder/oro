import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * S8-09: Bulk Cost / Price Update Tools
 *
 * POST /api/inventory/bulk-price-update — Apply bulk price changes with preview
 * POST /api/inventory/bulk-cost-update — Apply bulk cost changes with preview
 *
 * Body: { categoryId?, adjustmentType, adjustmentValue, preview? }
 * adjustmentType: PERCENT_INCREASE | PERCENT_DECREASE | FIXED_INCREASE | FIXED_DECREASE | SET_MARKUP
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Owner+ only
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ access required' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { categoryId, adjustmentType, adjustmentValue, preview, field } = body as {
            categoryId?: string
            adjustmentType: string
            adjustmentValue: number
            preview?: boolean
            field?: 'price' | 'cost' // S8-09: Support both price and cost
        }

        const targetField = field || 'price'

        if (!adjustmentType || adjustmentValue == null) {
            return NextResponse.json({ error: 'adjustmentType and adjustmentValue required' }, { status: 400 })
        }

        const validTypes = ['PERCENT_INCREASE', 'PERCENT_DECREASE', 'FIXED_INCREASE', 'FIXED_DECREASE', 'SET_MARKUP']
        if (!validTypes.includes(adjustmentType)) {
            return NextResponse.json({ error: `adjustmentType must be: ${validTypes.join(', ')}` }, { status: 400 })
        }

        const where: any = { franchiseId: user.franchiseId, isActive: true }
        if (categoryId) where.categoryId = categoryId

        const items = await prisma.item.findMany({
            where,
            select: { id: true, name: true, price: true, cost: true, sku: true, barcode: true, category: { select: { name: true } } }
        })

        const changes = items.map(item => {
            const oldValue = Number(targetField === 'cost' ? item.cost : item.price) || 0
            let newValue = oldValue

            switch (adjustmentType) {
                case 'PERCENT_INCREASE':
                    newValue = oldValue * (1 + adjustmentValue / 100)
                    break
                case 'PERCENT_DECREASE':
                    newValue = oldValue * (1 - adjustmentValue / 100)
                    break
                case 'FIXED_INCREASE':
                    newValue = oldValue + adjustmentValue
                    break
                case 'FIXED_DECREASE':
                    newValue = oldValue - adjustmentValue
                    break
                case 'SET_MARKUP':
                    const cost = Number(item.cost || 0)
                    newValue = cost > 0 ? cost * (1 + adjustmentValue / 100) : oldValue
                    break
            }

            newValue = Math.max(0, Math.round(newValue * 100) / 100)

            return {
                itemId: item.id,
                name: item.name,
                sku: item.sku,
                category: item.category?.name,
                oldValue, newValue,
                change: Math.round((newValue - oldValue) * 100) / 100,
                changed: Math.abs(newValue - oldValue) > 0.001
            }
        })

        const changedItems = changes.filter(c => c.changed)
        const totalImpact = Math.round(changedItems.reduce((s, c) => s + c.change, 0) * 100) / 100

        // Preview mode — return what would change without applying
        if (preview) {
            return NextResponse.json({
                preview: true,
                field: targetField,
                adjustmentType, adjustmentValue,
                categoryId: categoryId || 'ALL',
                totalItems: items.length,
                itemsAffected: changedItems.length,
                totalImpact,
                changes: changedItems.slice(0, 100) // First 100
            })
        }

        // Apply changes
        let updated = 0
        for (const change of changedItems) {
            await prisma.item.update({
                where: { id: change.itemId },
                data: { [targetField]: change.newValue }
            })
            updated++
        }

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'BULK_PRICE_UPDATE', entityType: 'Item', entityId: user.franchiseId,
            details: {
                field: targetField, adjustmentType, adjustmentValue,
                categoryId: categoryId || 'ALL',
                itemsUpdated: updated, totalImpact
            }
        })

        return NextResponse.json({
            applied: true,
            field: targetField,
            itemsUpdated: updated,
            totalImpact
        })
    } catch (error: any) {
        console.error('[BULK_UPDATE_POST]', error)
        return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
    }
}
