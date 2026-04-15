import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// POST: Update employee permission
export async function POST(request: Request) {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { employeeId, permission, value } = body

        // Validate permission field
        const validPermissions = ['canManageShifts', 'canClockIn', 'canClockOut']
        if (!validPermissions.includes(permission)) {
            return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })
        }

        // Update employee permission
        const employee = await prisma.user.update({
            where: { id: employeeId },
            data: {
                [permission]: value
            }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'OWNER',
            action: 'EMPLOYEE_PERMISSION_CHANGE',
            entityType: 'User',
            entityId: employeeId,
            metadata: { permission, value }
        })

        return NextResponse.json({ success: true, employee })
    } catch (error) {
        console.error('Error updating employee permission:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

