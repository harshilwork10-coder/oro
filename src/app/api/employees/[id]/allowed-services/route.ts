import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/employees/[id]/allowed-services - Get employee's allowed services
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = params

        // Get employee with their allowed services
        const employee = await prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                allowedServices: {
                    include: {
                        service: true
                    }
                },
                franchise: {
                    include: {
                        services: true // All shop services for selection
                    }
                }
            }
        })

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        // Get IDs of currently allowed services
        const allowedServiceIds = employee.allowedServices.map(as => as.serviceId)

        // Build list of all shop services with allowed status
        const services = employee.franchise?.services?.map(service => ({
            id: service.id,
            name: service.name,
            price: Number(service.price),
            duration: service.duration,
            isAllowed: allowedServiceIds.includes(service.id)
        })) || []

        return NextResponse.json({
            employeeId: employee.id,
            employeeName: employee.name,
            canSetOwnPrices: employee.canSetOwnPrices,
            services,
            allowedCount: allowedServiceIds.length,
            totalCount: services.length
        })

    } catch (error) {
        console.error('Error fetching employee allowed services:', error)
        return NextResponse.json({ error: 'Failed to fetch allowed services' }, { status: 500 })
    }
}

// PUT /api/employees/[id]/allowed-services - Update employee's allowed services
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = params
        const body = await request.json()
        const { serviceIds, canSetOwnPrices } = body

        // Validate serviceIds is an array
        if (!Array.isArray(serviceIds)) {
            return NextResponse.json({ error: 'serviceIds must be an array' }, { status: 400 })
        }

        // Delete all existing allowed services for this employee
        await prisma.barberAllowedService.deleteMany({
            where: { userId: employeeId }
        })

        // Create new allowed services
        if (serviceIds.length > 0) {
            await prisma.barberAllowedService.createMany({
                data: serviceIds.map((serviceId: string) => ({
                    userId: employeeId,
                    serviceId
                }))
            })
        }

        // Update canSetOwnPrices if provided
        if (typeof canSetOwnPrices === 'boolean') {
            await prisma.user.update({
                where: { id: employeeId },
                data: { canSetOwnPrices }
            })
        }

        return NextResponse.json({
            message: 'Allowed services updated successfully',
            allowedCount: serviceIds.length
        })

    } catch (error) {
        console.error('Error updating employee allowed services:', error)
        return NextResponse.json({ error: 'Failed to update allowed services' }, { status: 500 })
    }
}
