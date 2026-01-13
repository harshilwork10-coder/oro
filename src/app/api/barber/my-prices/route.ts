import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/barber/my-prices - Get barber's price overrides
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with their canSetOwnPrices permission and franchise info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                franchise: {
                    include: {
                        services: true // Shop's service menu
                    }
                },
                priceOverrides: true // User's price overrides
            }
        })

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
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { canSetOwnPrices: true }
        })

        if (!user?.canSetOwnPrices) {
            return NextResponse.json({
                error: 'You are not authorized to set your own prices'
            }, { status: 403 })
        }

        const body = await request.json()
        const { serviceId, price } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        // If price is null/undefined, remove the override (use shop default)
        if (price === null || price === undefined) {
            await prisma.employeeServicePriceOverride.deleteMany({
                where: {
                    userId: session.user.id,
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
                    userId: session.user.id,
                    serviceId: serviceId
                }
            },
            update: {
                price: numericPrice
            },
            create: {
                userId: session.user.id,
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
