import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get employee's services with their custom prices
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const employeeId = searchParams.get('employeeId') || session.user.id

        // Get employee's custom service pricing
        const employeeServices = await prisma.employeeService.findMany({
            where: { employeeId, isActive: true },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        duration: true,
                        price: true, // Base price from franchise
                        categoryId: true,
                        serviceCategory: {
                            select: { name: true }
                        }
                    }
                }
            }
        })

        // Map to include both base price and employee price
        const servicesWithPricing = employeeServices.map(es => ({
            id: es.id,
            serviceId: es.service.id,
            serviceName: es.service.name,
            description: es.service.description,
            category: es.service.serviceCategory?.name || 'Uncategorized',
            basePrice: es.service.price,
            baseDuration: es.service.duration,
            employeePrice: es.price,
            employeeDuration: es.duration || es.service.duration,
            isActive: es.isActive
        }))

        return NextResponse.json({ services: servicesWithPricing })
    } catch (error) {
        console.error('Error fetching employee services:', error)
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
}

// POST: Set employee's custom price for a service
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { serviceId, price, duration } = await req.json()

        if (!serviceId || price === undefined) {
            return NextResponse.json({ error: 'serviceId and price are required' }, { status: 400 })
        }

        // Check if user's franchise allows per-barber pricing
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                franchiseId: true,
                franchise: {
                    select: {
                        franchisor: {
                            select: { businessType: true }
                        }
                    }
                }
            }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Only MULTI_LOCATION_OWNER can have per-barber pricing
        const businessType = user.franchise?.franchisor?.businessType
        if (businessType === 'BRAND_FRANCHISOR') {
            return NextResponse.json({
                error: 'Per-barber pricing is not available for franchise locations. Pricing is set by the franchisor.'
            }, { status: 403 })
        }

        // Verify service belongs to user's franchise
        const service = await prisma.service.findFirst({
            where: {
                id: serviceId,
                franchiseId: user.franchiseId
            }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        // Upsert employee service pricing
        const employeeService = await prisma.employeeService.upsert({
            where: {
                employeeId_serviceId: {
                    employeeId: session.user.id,
                    serviceId: serviceId
                }
            },
            update: {
                price: price,
                duration: duration || null,
                isActive: true
            },
            create: {
                employeeId: session.user.id,
                serviceId: serviceId,
                price: price,
                duration: duration || null,
                isActive: true
            }
        })

        return NextResponse.json({
            success: true,
            employeeService: {
                id: employeeService.id,
                serviceId: employeeService.serviceId,
                price: employeeService.price,
                duration: employeeService.duration
            }
        })
    } catch (error) {
        console.error('Error setting employee service price:', error)
        return NextResponse.json({ error: 'Failed to set price' }, { status: 500 })
    }
}

// DELETE: Remove employee's custom pricing (use base price instead)
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { serviceId } = await req.json()

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        await prisma.employeeService.deleteMany({
            where: {
                employeeId: session.user.id,
                serviceId: serviceId
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error removing employee service:', error)
        return NextResponse.json({ error: 'Failed to remove price' }, { status: 500 })
    }
}
