import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Assign employee to a station
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        // Only owners/managers can assign employees to stations
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { stationId, employeeId } = await request.json()

        if (!stationId || !employeeId) {
            return NextResponse.json({ error: 'Station ID and Employee ID required' }, { status: 400 })
        }

        // Update the employee's assigned station
        const updatedEmployee = await prisma.user.update({
            where: { id: employeeId },
            data: { assignedStationId: stationId }
        })

        return NextResponse.json({
            success: true,
            message: 'Employee assigned to station',
            employee: {
                id: updatedEmployee.id,
                name: updatedEmployee.name,
                assignedStationId: updatedEmployee.assignedStationId
            }
        })
    } catch (error) {
        console.error('[ASSIGN_EMPLOYEE_POST]', error)
        return NextResponse.json({ error: 'Failed to assign employee' }, { status: 500 })
    }
}

// DELETE - Unassign employee from their current station
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { employeeId } = await request.json()

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
        }

        // Remove employee's station assignment
        await prisma.user.update({
            where: { id: employeeId },
            data: { assignedStationId: null }
        })

        return NextResponse.json({ success: true, message: 'Employee unassigned' })
    } catch (error) {
        console.error('[ASSIGN_EMPLOYEE_DELETE]', error)
        return NextResponse.json({ error: 'Failed to unassign employee' }, { status: 500 })
    }
}

