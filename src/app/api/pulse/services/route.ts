import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pulse/services
 * Fetch services for Pulse app (SERVICE/SALON mode only)
 * Returns service list, categories, and pricing
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check industry type - services are for SERVICE/SALON only
        const industryType = (session.user as any)?.industryType || 'SERVICE'
        if (industryType === 'RETAIL') {
            return NextResponse.json({
                error: 'Services are for service-based businesses only. Use /api/pulse/inventory for retail businesses.',
                code: 'WRONG_INDUSTRY_TYPE',
                industryType
            }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const categoryId = searchParams.get('categoryId')

        // Get user's franchise
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ services: [], categories: [] })
        }

        // Fetch service categories
        const categories = await (prisma as any).serviceCategory.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, name: true, order: true },
            orderBy: { order: 'asc' }
        }).catch(() => [])

        // Fetch services
        const services = await (prisma as any).service.findMany({
            where: {
                franchiseId: user.franchiseId,
                isActive: true,
                ...(categoryId ? { categoryId } : {}),
                ...(search ? {
                    OR: [
                        { name: { contains: search } },
                        { description: { contains: search } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                duration: true,
                categoryId: true,
                category: { select: { name: true } }
            },
            orderBy: { name: 'asc' },
            take: 50
        }).catch(() => [])

        return NextResponse.json({
            services: services.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                price: Number(s.price || 0),
                duration: s.duration || 30,
                categoryId: s.categoryId,
                categoryName: s.category?.name || 'Uncategorized'
            })),
            categories
        })

    } catch (error) {
        console.error('Pulse services error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * PUT /api/pulse/services
 * Update service price/duration
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { serviceId, price, duration } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
        }

        // Verify user owns this service
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        const service = await (prisma as any).service.findFirst({
            where: { id: serviceId, franchiseId: user.franchiseId }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        // Update service
        const updated = await (prisma as any).service.update({
            where: { id: serviceId },
            data: {
                ...(price !== undefined ? { price } : {}),
                ...(duration !== undefined ? { duration } : {})
            }
        })

        return NextResponse.json({ success: true, service: updated })

    } catch (error) {
        console.error('Pulse service update error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
