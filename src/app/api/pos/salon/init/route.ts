import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Combined initialization endpoint for Salon POS
 * Reduces 5 API calls to 1 for faster page load and lower serverless costs
 * 
 * Returns: menu, employees, pricingSettings, activeShift
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = user.franchiseId
    const userId = user.id

    try {
        // Debug log removed

        // Parallel fetch all data needed for Salon POS
        const [
            services,
            products,
            discounts,
            employees,
            franchise,
            franchiseSettings,
            activeShift
        ] = await Promise.all([
            // Services with category
            prisma.service.findMany({
                where: { franchiseId },
                orderBy: { name: 'asc' },
                include: {
                    serviceCategory: { select: { name: true } }
                }
            }),

            // Products
            prisma.product.findMany({
                where: { franchiseId, isActive: true },
                orderBy: { name: 'asc' },
                take: 100
            }),

            // Discounts
            prisma.discount.findMany({
                where: { franchiseId, isActive: true }
            }),

            // Employees (staff for barber selection)
            prisma.user.findMany({
                where: { franchiseId, role: 'EMPLOYEE' },
                select: {
                    id: true,
                    name: true
                },
                orderBy: { name: 'asc' }
            }),

            // Franchise id check
            prisma.franchise.findUnique({
                where: { id: franchiseId },
                select: {
                    id: true
                }
            }),

            // Franchise settings
            prisma.franchiseSettings.findFirst({
                where: { franchiseId }
            }),

            // Active shift for current user
            prisma.cashDrawerSession.findFirst({
                where: {
                    employeeId: userId,
                    status: 'OPEN'
                },
                orderBy: { startTime: 'desc' }
            })
        ])

        // Format services with category
        const formattedServices = services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            price: Number(s.price),
            category: s.serviceCategory?.name || 'Services'
        }))

        // Format products
        const formattedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            stock: p.stock,
            barcode: p.barcode
        }))

        // Format discounts
        const formattedDiscounts = discounts.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            value: Number(d.value)
        }))

        return NextResponse.json({
            menu: {
                services: formattedServices,
                products: formattedProducts,
                discounts: formattedDiscounts
            },
            employees: employees,
            pricingSettings: franchiseSettings ? {
                pricingModel: franchiseSettings.pricingModel || 'STANDARD',
                cardSurchargeType: franchiseSettings.cardSurchargeType || 'PERCENTAGE',
                cardSurcharge: Number(franchiseSettings.cardSurcharge) || 0,
                showDualPricing: franchiseSettings.showDualPricing || false,
                taxRate: Number(franchiseSettings.taxRate) || 0.08
            } : {
                pricingModel: 'STANDARD',
                cardSurchargeType: 'PERCENTAGE',
                cardSurcharge: 0,
                showDualPricing: false,
                taxRate: 0.08
            },
            activeShift: activeShift ? {
                id: activeShift.id,
                startTime: activeShift.startTime,
                startingCash: Number(activeShift.startingCash)
            } : null
        })

    } catch (error) {
        console.error('[SALON_POS_INIT]', error)
        return NextResponse.json({ error: 'Failed to initialize Salon POS' }, { status: 500 })
    }
}
