import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * S8-11: Open Ring Custom Description + Line Notes
 *
 * GET /api/pos/open-ring — Available departments + settings
 * POST /api/pos/open-ring — Create manual item entry with custom description + note
 *
 * Enhancements over legacy:
 * - Mandatory description (min 2 chars)
 * - Optional line note (printed on receipt + stored in transaction)
 * - Audit logging for loss prevention
 * - Modern auth (getAuthUser)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const products = await prisma.product.findMany({
            where: { franchiseId: user.franchiseId, isActive: true },
            select: { category: true },
            distinct: ['category']
        })

        const deptList = products
            .map(d => d.category || 'General')
            .filter(Boolean)
            .sort()

        const common = ['Deli', 'Grocery', 'Tobacco', 'Beverage', 'Snacks', 'Dairy', 'Produce', 'Household', 'Other']
        for (const c of common) {
            if (!deptList.includes(c)) deptList.push(c)
        }

        return NextResponse.json({
            departments: deptList,
            settings: {
                requireManagerApproval: false,
                maxOpenRingAmount: 999.99,
                defaultTaxable: true,
                requireDescription: true  // S8-11
            }
        })
    } catch (error: any) {
        console.error('[OPEN_RING_GET]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { price, department, description, note, taxable = true, quantity = 1 } = body

        if (!price || price <= 0) return NextResponse.json({ error: 'Valid price required' }, { status: 400 })
        if (!department) return NextResponse.json({ error: 'Department required' }, { status: 400 })
        if (price > 999.99) return NextResponse.json({ error: 'Amount exceeds max ($999.99)' }, { status: 400 })

        // S8-11: Mandatory description (enforced)
        if (!description?.trim() || description.trim().length < 2) {
            return NextResponse.json({ error: 'Description required (min 2 characters)' }, { status: 400 })
        }

        const openRingItem = {
            id: `OPEN-${Date.now().toString(36).toUpperCase()}`,
            name: description.trim(),
            price: Math.round(price * 100) / 100,
            unitPrice: Math.round(price * 100) / 100,
            quantity,
            department,
            taxable,
            isOpenRing: true,
            note: note?.trim() || null,  // S8-11: line note
            total: Math.round(price * quantity * 100) / 100,
            cashier: user.email,
            timestamp: new Date().toISOString()
        }

        // S8-11: Audit log every open ring for loss prevention
        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'OPEN_RING_CREATED', entityType: 'OpenRing', entityId: openRingItem.id,
            details: {
                price: openRingItem.price, description: openRingItem.name,
                department, note: openRingItem.note, taxable, quantity
            }
        })

        return NextResponse.json({ success: true, item: openRingItem })
    } catch (error: any) {
        console.error('[OPEN_RING_POST]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
