import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = session.user.franchiseId

    if (!franchiseId) {
        return NextResponse.json({ error: 'No franchise associated' }, { status: 403 })
    }

    try {
        // Fetch real services from database
        const services = await prisma.service.findMany({
            where: {
                franchiseId
            },
            include: {
                serviceCategory: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Fetch real products from database
        const products = await prisma.product.findMany({
            where: {
                franchiseId,
                isActive: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Fetch discounts from database
        const discounts = await prisma.discount.findMany({
            where: {
                franchiseId,
                isActive: true
            }
        })

        // Transform services to include category string for POS compatibility
        const servicesFormatted = services.map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: parseFloat(service.price.toString()),
            duration: service.duration,
            category: service.serviceCategory?.name || 'SERVICES',
            franchiseId: service.franchiseId
        }))

        // Add built-in "Open Item" for custom pricing (always available)
        const openItem = {
            id: 'open-item',
            name: 'Open Item',
            description: 'Enter any custom amount for miscellaneous services',
            price: 0,
            duration: 0,
            category: 'CUSTOM',
            franchiseId: franchiseId,
            isOpenItem: true
        }
        servicesFormatted.unshift(openItem)

        // Transform products for POS
        const productsFormatted = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price.toString()),
            stock: product.stock,
            category: product.category || 'PRODUCTS',
            franchiseId: product.franchiseId
        }))

        return NextResponse.json({
            services: servicesFormatted,
            products: productsFormatted,
            discounts
        })
    } catch (error) {
        console.error('[API_MENU_ERROR]', error)
        return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 })
    }
}

