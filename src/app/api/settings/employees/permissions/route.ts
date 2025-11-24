import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Update employee permission
export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
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

        return NextResponse.json({ success: true, employee })
    } catch (error) {
        console.error('Error updating employee permission:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
