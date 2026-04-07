import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/tobacco-scan/current-week - Get current week tobacco sales by manufacturer
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get start and end of current week (Sunday to Saturday)
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        let byManufacturer: any[] = []

        try {
            // Get all tobacco product sales this week
            const transactions = await prisma.transaction.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    status: 'COMPLETED',
                    createdAt: {
                        gte: startOfWeek,
                        lte: endOfWeek
                    }
                },
                include: {
                    lineItems: {
                        where: { type: 'PRODUCT' },
                        include: { product: true }
                    }
                }
            })

            // Filter for tobacco products and group by manufacturer
            const tobaccoSales = transactions.flatMap(t =>
                t.lineItems.filter(item => item.product?.isTobacco)
            )

            // Manufacturer detection based on product name patterns
            const manufacturers: Record<string, string[]> = {
                ALTRIA: ['marlboro', 'virginia slims', 'parliament', 'basic', 'l&m'],
                RJR: ['camel', 'newport', 'pall mall', 'doral', 'natural american'],
                ITG: ['kool', 'winston', 'maverick', 'salem', 'usa gold']
            }

            byManufacturer = Object.entries(manufacturers).map(([manufacturer, keywords]) => {
                const sales = tobaccoSales.filter(item => {
                    const name = item.product?.name?.toLowerCase() || ''
                    return keywords.some(kw => name.includes(kw))
                })

                return {
                    manufacturer,
                    totalScans: sales.reduce((sum, item) => sum + item.quantity, 0),
                    totalAmount: sales.reduce((sum, item) => sum + (parseFloat(item.price.toString()) * item.quantity), 0),
                    sales: sales.map(item => ({
                        id: item.id,
                        productName: item.product?.name || 'Unknown',
                        barcode: item.product?.barcode || '',
                        quantity: item.quantity,
                        unitPrice: parseFloat(item.price.toString()),
                        totalPrice: parseFloat(item.price.toString()) * item.quantity
                    }))
                }
            })
        } catch (dbErr: any) {
            console.warn('[TOBACCO_CURRENT_WEEK] DB query failed:', dbErr?.message)
        }

        return NextResponse.json({
            weekStartDate: startOfWeek.toISOString(),
            weekEndDate: endOfWeek.toISOString(),
            byManufacturer
        })
    } catch (error) {
        console.error('[TOBACCO_CURRENT_WEEK]', error)
        return NextResponse.json({
            weekStartDate: new Date().toISOString(),
            weekEndDate: new Date().toISOString(),
            byManufacturer: []
        })
    }
}
