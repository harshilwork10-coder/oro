/**
 * Promotion Effectiveness Report API
 *
 * GET — Analyze performance of active and past promotions
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const status = searchParams.get('status') // ACTIVE, EXPIRED, SCHEDULED
        const since = new Date(); since.setDate(since.getDate() - days)

        // Get promotions
        const where: Record<string, unknown> = { franchiseId: user.franchiseId }
        if (status === 'ACTIVE') {
            where.startDate = { lte: new Date() }
            where.endDate = { gte: new Date() }
            where.isActive = true
        } else if (status === 'EXPIRED') {
            where.endDate = { lt: new Date() }
        }

        const promotions = await prisma.promotion.findMany({
            where,
            include: {
                products: {
                    include: { product: { select: { id: true, name: true, barcode: true, price: true } } }
                }
            },
            orderBy: { startDate: 'desc' }
        })

        const results = await Promise.all(promotions.map(async (promo) => {
            const promoProductIds = promo.products.map(pp => pp.productId)

            // Get sales of promoted products during promo period
            const promoStart = promo.startDate || since
            const promoEnd = promo.endDate || new Date()

            let promoSales = 0
            let promoUnits = 0

            if (promoProductIds.length > 0) {
                const sales = await prisma.transactionLineItem.findMany({
                    where: {
                        type: 'PRODUCT',
                        productId: { in: promoProductIds },
                        transaction: {
                            franchiseId: user.franchiseId,
                            status: 'COMPLETED',
                            createdAt: { gte: promoStart, lte: promoEnd }
                        }
                    },
                    select: { total: true, quantity: true }
                })

                promoSales = sales.reduce((s, li) => s + Number(li.total || 0), 0)
                promoUnits = sales.reduce((s, li) => s + (li.quantity || 1), 0)
            }

            const now = new Date()
            const promoStatus = !promo.isActive ? 'DISABLED'
                : promo.endDate && promo.endDate < now ? 'EXPIRED'
                    : promo.startDate && promo.startDate > now ? 'SCHEDULED'
                        : 'ACTIVE'

            return {
                id: promo.id,
                name: promo.name,
                description: promo.description,
                type: promo.type,
                status: promoStatus,
                startDate: promo.startDate,
                endDate: promo.endDate,
                productCount: promo.products.length,
                products: promo.products.map(pp => ({
                    name: pp.product.name,
                    barcode: pp.product.barcode,
                    regularPrice: Number(pp.product.price),
                    promoPrice: Number(pp.promoPrice || 0)
                })),
                performance: {
                    revenue: Math.round(promoSales * 100) / 100,
                    unitsSold: promoUnits
                }
            }
        }))

        return NextResponse.json({
            promotions: results,
            summary: {
                total: results.length,
                active: results.filter(r => r.status === 'ACTIVE').length,
                expired: results.filter(r => r.status === 'EXPIRED').length,
                totalPromoRevenue: Math.round(results.reduce((s, r) => s + r.performance.revenue, 0) * 100) / 100
            },
            periodDays: days
        })
    } catch (error) {
        console.error('[PROMO_EFFECT_GET]', error)
        return NextResponse.json({ error: 'Failed to generate promo effectiveness report' }, { status: 500 })
    }
}
