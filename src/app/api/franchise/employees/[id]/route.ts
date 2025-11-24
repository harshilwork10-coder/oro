import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    // Only owners/managers can update employees
    if (user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, pin, permissions } = body

    const updateData: any = {
        name,
        email,
        // Permissions
        canAddServices: permissions?.canAddServices,
        canAddProducts: permissions?.canAddProducts,
        canManageInventory: permissions?.canManageInventory,
        canViewReports: permissions?.canViewReports,
        canProcessRefunds: permissions?.canProcessRefunds,
        canManageSchedule: permissions?.canManageSchedule,
        canManageEmployees: permissions?.canManageEmployees,
    }

    if (password) {
        updateData.password = await hash(password, 10)
    }

    if (pin) {
        updateData.pin = await hash(pin, 10)
    }

    const { id } = await params
    const updatedEmployee = await prisma.user.update({
        where: {
            id,
            franchiseId: user.franchiseId
        },
        data: updateData
    })

    const { password: _, ...employeeWithoutPassword } = updatedEmployee
    return NextResponse.json(employeeWithoutPassword)
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    // Only owners/managers can delete employees
    if (user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id } = await params
    await prisma.user.delete({
        where: {
            id,
            franchiseId: user.franchiseId
        }
    })

    return NextResponse.json({ success: true })
}
