import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Open Ring / Department Key API
 * 
 * When an item isn't in the system, cashier enters:
 *   - Price (e.g. $5.99)
 *   - Department (e.g. "Deli", "Grocery", "Tobacco")
 * 
 * Creates a one-time line item charged to a department for tracking.
 * Every c-store POS has this — it's the "misc" button.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Return available departments for open ring
        const departments = await prisma.product.findMany({
            where: { franchiseId, isActive: true },
            select: { category: true },
            distinct: ['category'],
        })

        const deptList = departments
            .map(d => d.category || 'General')
            .filter(Boolean)
            .sort()

        // Add common departments if not present
        const common = ['Deli', 'Grocery', 'Tobacco', 'Beverage', 'Snacks', 'Dairy', 'Produce', 'Household', 'Other']
        for (const c of common) {
            if (!deptList.includes(c)) deptList.push(c)
        }

        return NextResponse.json({
            departments: deptList,
            settings: {
                requireManagerApproval: false,  // can be configured
                maxOpenRingAmount: 999.99,
                defaultTaxable: true,
            },
        })

    } catch (error) {
        console.error('Open Ring GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { price, department, description, taxable = true, quantity = 1 } = await request.json()

        if (!price || price <= 0) {
            return NextResponse.json({ error: 'Valid price required' }, { status: 400 })
        }

        if (!department) {
            return NextResponse.json({ error: 'Department required' }, { status: 400 })
        }

        if (price > 999.99) {
            return NextResponse.json({ error: 'Amount exceeds max ($999.99). Manager override required.' }, { status: 400 })
        }

        // Return a virtual line item (not a real product — it's a one-off entry)
        const openRingItem = {
            id: `OPEN-${Date.now().toString(36).toUpperCase()}`,
            name: description || `${department} - Open Ring`,
            price: Math.round(price * 100) / 100,
            quantity,
            department,
            taxable,
            isOpenRing: true,
            total: Math.round(price * quantity * 100) / 100,
            cashier: user.name || user.email,
            timestamp: new Date().toISOString(),
        }

        return NextResponse.json({
            success: true,
            item: openRingItem,
        })

    } catch (error) {
        console.error('Open Ring POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
