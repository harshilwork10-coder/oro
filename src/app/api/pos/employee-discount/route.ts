import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Employee Discount — Check and set employee discount rates
 * GET /api/pos/employee-discount?employeeId=xxx
 * PUT /api/pos/employee-discount — Set discount rate (Owner+ only)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

    try {
        const employee = await prisma.user.findFirst({
            where: { id: employeeId, franchiseId: user.franchiseId },
            select: { id: true, name: true, role: true, employeeDiscountPct: true, employeeDiscountEnabled: true }
        })
        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

        return NextResponse.json({
            employeeId: employee.id, name: employee.name,
            discountEnabled: employee.employeeDiscountEnabled || false,
            discountPercent: employee.employeeDiscountPct ? Number(employee.employeeDiscountPct) : 0
        })
    } catch (error: any) {
        console.error('[EMP_DISCOUNT_GET]', error)
        return NextResponse.json({ error: 'Failed to check employee discount' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { employeeId, discountPercent, enabled } = await req.json()
        if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

        await prisma.user.update({
            where: { id: employeeId },
            data: { employeeDiscountPct: discountPercent ?? 0, employeeDiscountEnabled: enabled ?? false }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'EMPLOYEE_DISCOUNT_SET', entityType: 'EmployeeDiscount', entityId: employeeId,
            details: { discountPercent, enabled }
        })

        return NextResponse.json({ updated: true })
    } catch (error: any) {
        console.error('[EMP_DISCOUNT_PUT]', error)
        return NextResponse.json({ error: 'Failed to update employee discount' }, { status: 500 })
    }
}
