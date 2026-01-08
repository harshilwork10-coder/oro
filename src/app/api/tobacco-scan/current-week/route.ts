import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tobacco-scan/current-week - Get current week tobacco sales by manufacturer
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
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

        // Get all tobacco product sales this week
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfWeek,
                    lte: endOfWeek
                }
            },
            include: {
                lineItems: {
                    where: {
                        type: 'PRODUCT'
                    },
                    include: {
                        product: true
                    }
                }
            }
        })

        // Filter for tobacco products and group by manufacturer guess
        // In a real implementation, products would have manufacturer field
        const tobaccoSales = transactions.flatMap(t =>
            t.lineItems.filter(item => item.product?.isTobacco)
        )

        // Simple manufacturer detection based on product name patterns
        // In production, this would be a proper manufacturer field on products
        const manufacturers = {
            ALTRIA: ['marlboro', 'virginia slims', 'parliament', 'basic', 'l&m'],
            RJR: ['camel', 'newport', 'pall mall', 'doral', 'natural american'],
            ITG: ['kool', 'winston', 'maverick', 'salem', 'usa gold']
        }

        const byManufacturer = Object.entries(manufacturers).map(([manufacturer, keywords]) => {
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

        return NextResponse.json({
            weekStartDate: startOfWeek.toISOString(),
            weekEndDate: endOfWeek.toISOString(),
            byManufacturer
        })
    } catch (error) {
        console.error('Failed to fetch current week tobacco data:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}

