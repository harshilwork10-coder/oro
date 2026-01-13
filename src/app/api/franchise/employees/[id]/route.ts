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
    if (user.role !== 'FRANCHISEE' && user.role !== 'FRANCHISOR' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
        name,
        email,
        phone,
        password,
        pin,
        permissions,
        // Compensation fields
        compensationType,
        chairRentAmount,
        chairRentPeriod,
        assignedResourceId,
        commissionSplit,
        hourlyRate,
        salaryAmount,
        salaryPeriod,
        requiresTimeClock,
        canSetOwnPrices
    } = body

    const { id } = await params

    // Update employee basic info
    const updateData: any = {
        name,
        email,
        phone: phone?.replace(/\D/g, '') || undefined, // Store only digits
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

    const updatedEmployee = await prisma.user.update({
        where: {
            id,
            franchiseId: user.franchiseId
        },
        data: updateData
    })

    // Handle compensation plan update/create if compensation type is provided
    if (compensationType) {
        // Find existing active compensation plan
        const existingPlan = await prisma.compensationPlan.findFirst({
            where: {
                userId: id,
                effectiveTo: null
            }
        })

        const compensationData = {
            workerType: compensationType === 'CHAIR_RENTAL' ? 'BOOTH_RENTER' : 'W2_EMPLOYEE',
            compensationType,
            chairRentAmount: chairRentAmount ? parseFloat(chairRentAmount) : null,
            chairRentPeriod: chairRentPeriod || null,
            chairRentStartDate: compensationType === 'CHAIR_RENTAL' ? new Date() : null,
            commissionSplit: commissionSplit ? parseFloat(commissionSplit) : null,
            hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
            salaryAmount: salaryAmount ? parseFloat(salaryAmount) : null,
            salaryPeriod: salaryPeriod || null,
            requiresTimeClock: requiresTimeClock || false,
            canSetOwnPrices: canSetOwnPrices ?? (compensationType === 'CHAIR_RENTAL'),
        }

        if (existingPlan) {
            // Update existing plan
            await prisma.compensationPlan.update({
                where: { id: existingPlan.id },
                data: compensationData
            })
        } else {
            // Create new plan
            await prisma.compensationPlan.create({
                data: {
                    userId: id,
                    locationId: null,
                    effectiveFrom: new Date(),
                    ...compensationData
                }
            })
        }

        // Handle resource assignment if provided
        if (assignedResourceId) {
            // Remove existing assignments
            await prisma.userResource.deleteMany({ where: { userId: id } })
            // Create new assignment
            await prisma.userResource.create({
                data: {
                    userId: id,
                    resourceId: assignedResourceId,
                    isDefault: true
                }
            })
        }
    }

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
    if (user.role !== 'FRANCHISEE' && user.role !== 'FRANCHISOR' && !user.canManageEmployees) {
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
