import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tobacco-scan/rebate-estimate - Calculate estimated rebates
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get manufacturer configs with rebate rates
        const configs = await prisma.manufacturerConfig.findMany({
            where: { franchiseId: session.user.franchiseId, isActive: true }
        })

        // Get current week dates
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Get start of month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        // Get tobacco transactions this week
        const weeklyTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: startOfWeek, lte: endOfWeek }
            },
            include: {
                lineItems: {
                    where: { type: 'PRODUCT' },
                    include: { product: true }
                }
            }
        })

        // Get tobacco transactions this month
        const monthlyTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: startOfMonth, lte: endOfMonth }
            },
            include: {
                lineItems: {
                    where: { type: 'PRODUCT' },
                    include: { product: true }
                }
            }
        })

        // Count tobacco items
        const countTobaccoItems = (transactions: any[]) => {
            let packCount = 0
            let cartonCount = 0

            for (const tx of transactions) {
                for (const item of tx.lineItems) {
                    if (item.product?.isTobacco) {
                        // Simple heuristic: if price > $50, it's likely a carton
                        const price = parseFloat(item.price?.toString() || '0')
                        if (price > 50) {
                            cartonCount += item.quantity
                        } else {
                            packCount += item.quantity
                        }
                    }
                }
            }

            return { packCount, cartonCount }
        }

        const weeklyStats = countTobaccoItems(weeklyTransactions)
        const monthlyStats = countTobaccoItems(monthlyTransactions)

        // Calculate rebates using configured rates (or defaults)
        const defaultPackRate = 0.04
        const defaultCartonRate = 0.40

        // Average across manufacturers or use defaults
        const avgPackRate = configs.length > 0
            ? configs.reduce((sum, c) => sum + parseFloat(c.rebatePerPack?.toString() || '0.04'), 0) / configs.length
            : defaultPackRate
        const avgCartonRate = configs.length > 0
            ? configs.reduce((sum, c) => sum + parseFloat(c.rebatePerCarton?.toString() || '0.40'), 0) / configs.length
            : defaultCartonRate
        const totalLoyaltyBonus = configs.reduce((sum, c) => sum + parseFloat(c.loyaltyBonus?.toString() || '0'), 0)

        const weeklyRebate = (weeklyStats.packCount * avgPackRate) + (weeklyStats.cartonCount * avgCartonRate)
        const monthlyRebate = (monthlyStats.packCount * avgPackRate) + (monthlyStats.cartonCount * avgCartonRate) + totalLoyaltyBonus

        // Get active deals count
        const activeDeals = await prisma.tobaccoDeal.count({
            where: {
                franchiseId: session.user.franchiseId,
                isActive: true,
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            }
        })

        return NextResponse.json({
            weekly: {
                packCount: weeklyStats.packCount,
                cartonCount: weeklyStats.cartonCount,
                estimatedRebate: weeklyRebate
            },
            monthly: {
                packCount: monthlyStats.packCount,
                cartonCount: monthlyStats.cartonCount,
                loyaltyBonus: totalLoyaltyBonus,
                estimatedRebate: monthlyRebate
            },
            rates: {
                packRate: avgPackRate,
                cartonRate: avgCartonRate
            },
            activeDeals,
            configuredManufacturers: configs.length
        })
    } catch (error) {
        console.error('Failed to calculate rebate estimate:', error)
        return NextResponse.json({ error: 'Failed to calculate estimate' }, { status: 500 })
    }
}
