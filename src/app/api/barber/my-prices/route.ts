import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/barber/my-prices - Get barber's price overrides
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with their canSetOwnPrices permission and franchise info
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if user is allowed to set their own prices
        if (!user.canSetOwnPrices) {
            return NextResponse.json({
                canSetPrices: false,
                message: 'You are not authorized to set your own prices. This feature is for chair rental/booth renters only.',
                services: []
            })
        }

        // Get shop services with barber's override prices
        const services = user.franchise?.services?.map(service => {
            const override = user.priceOverrides.find(o => o.serviceId === service.id)
            return {
                id: service.id,
                name: service.name,
                duration: service.duration,
                defaultPrice: Number(service.price),
                myPrice: override ? Number(override.price) : null,
                hasOverride: !!override
            }
        }) || []

        return NextResponse.json({
            canSetPrices: true,
            services
        })

    } catch (error) {
        console.error('Error fetching barber prices:', error)
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
    }
}

// PUT /api/barber/my-prices - Update barber's price overrides
export async function PUT(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        if (!user?.canSetOwnPrices) {
            return NextResponse.json({
                error: 'You are not authorized to set your own prices'
            }, { status: 403 })
        }

        const body = await req.json()
        const { serviceId, price } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        // If price is null/undefined, remove the override (use shop default)
        if (price === null || price === undefined) {
            await prisma.employeeServicePriceOverride.deleteMany({
                where: {
                    userId: user.id,
                    serviceId: serviceId
                }
            })
            return NextResponse.json({
                message: 'Price override removed. Shop default price will be used.',
                hasOverride: false
            })
        }

        // Validate price
        const numericPrice = parseFloat(price)
        if (isNaN(numericPrice) || numericPrice < 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
        }

        // Upsert the price override
        const override = await prisma.employeeServicePriceOverride.upsert({
            where: {
                userId_serviceId: {
                    userId: user.id,
                    serviceId: serviceId
                }
            },
            update: {
                price: numericPrice
            },
            create: {
                userId: user.id,
                serviceId: serviceId,
                price: numericPrice
            }
        })

        return NextResponse.json({
            message: 'Price updated successfully',
            hasOverride: true,
            myPrice: Number(override.price)
        })

    } catch (error) {
        console.error('Error updating barber price:', error)
        return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
    }
}
