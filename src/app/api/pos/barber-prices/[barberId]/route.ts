import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/barber-prices/[barberId] - Get services with barber's prices for POS
// This is what POS calls when cashier selects a barber
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ barberId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { barberId } = await context.params

        // Get the barber (employee) with their price overrides and allowed services
        const barber = await prisma.user.findUnique({
            where: { id: barberId },
            include: {
                franchise: {
                    include: {
                        services: true
                    }
                },
                priceOverrides: true,
                allowedServices: true // NEW: Get barber's allowed services
            }
        })

        if (!barber) {
            return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
        }

        // Get list of service IDs this barber is allowed to perform
        const allowedServiceIds = barber.allowedServices.map(a => a.serviceId)
        const hasAllowedServicesRestriction = allowedServiceIds.length > 0

        // Build service list with barber-specific prices
        // Rule: If barber has override, use it. Otherwise use shop default.
        // Rule: If barber has allowedServices defined, ONLY show those services
        const allServices = barber.franchise?.services || []

        const services = allServices
            // Filter to only allowed services (if restriction exists)
            .filter(service => !hasAllowedServicesRestriction || allowedServiceIds.includes(service.id))
            .map(service => {
                const override = barber.priceOverrides.find(o => o.serviceId === service.id)
                const finalPrice = override ? Number(override.price) : Number(service.price)

                return {
                    id: service.id,
                    name: service.name,
                    duration: service.duration,
                    price: finalPrice, // THE PRICE TO CHARGE
                    shopPrice: Number(service.price),
                    hasCustomPrice: !!override,
                    category: (service as any).category || 'General'
                }
            })

        return NextResponse.json({
            barberId: barber.id,
            barberName: barber.name,
            hasAllowedServicesRestriction,
            totalShopServices: allServices.length,
            services
        })

    } catch (error) {
        console.error('Error fetching barber prices for POS:', error)
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
    }
}
