import { prisma } from '@/lib/prisma'

export class RoyaltyService {
    /**
     * Calculate royalty for a franchise for a given period
     */
    static async calculateRoyalty(
        franchiseId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ grossRevenue: number; royaltyAmount: number } | null> {
        try {
            // Get franchise with franchisor's royalty config
            const franchise = await prisma.franchise.findUnique({
                where: { id: franchiseId },
                include: {
                    franchisor: {
                        include: {
                            royaltyConfig: true
                        }
                    }
                }
            })

            if (!franchise || !franchise.franchisor.royaltyConfig) {
                return null
            }

            const config = franchise.franchisor.royaltyConfig

            // Get all transactions for the period
            // NOTE: This assumes you have a Transaction model - adjust based on your schema
            const transactions = await prisma.transaction.findMany({
                where: {
                    franchiseId,
                    createdAt: {
                        gte: periodStart,
                        lte: periodEnd
                    }
                }
            })

            const grossRevenue = transactions.reduce(
                (sum, tx) => sum + Number(tx.total),
                0
            )

            // Calculate royalty based on percentage
            let royaltyAmount = (grossRevenue * Number(config.percentage)) / 100

            // Apply minimum fee if configured
            if (config.minimumMonthlyFee) {
                royaltyAmount = Math.max(royaltyAmount, Number(config.minimumMonthlyFee))
            }

            return {
                grossRevenue,
                royaltyAmount
            }
        } catch (error) {
            console.error('Error calculating royalty:', error)
            return null
        }
    }

    /**
     * Generate royalty records for all franchises for a given period
     */
    static async generateRoyaltyRecords(periodStart: Date, periodEnd: Date) {
        try {
            const franchises = await prisma.franchise.findMany({
                include: {
                    franchisor: {
                        include: {
                            royaltyConfig: true
                        }
                    }
                }
            })

            const results = []

            for (const franchise of franchises) {
                if (!franchise.franchisor.royaltyConfig) continue

                const calculation = await this.calculateRoyalty(
                    franchise.id,
                    periodStart,
                    periodEnd
                )

                if (!calculation) continue

                // Create royalty record
                const record = await prisma.royaltyRecord.create({
                    data: {
                        franchiseId: franchise.id,
                        periodStart,
                        periodEnd,
                        grossRevenue: calculation.grossRevenue,
                        royaltyAmount: calculation.royaltyAmount,
                        status: 'PENDING'
                    }
                })

                results.push(record)
            }

            return results
        } catch (error) {
            console.error('Error generating royalty records:', error)
            return []
        }
    }

    /**
     * Get period dates based on calculation period type
     */
    static getPeriodDates(calculationPeriod: string): { start: Date; end: Date } {
        const now = new Date()
        const start = new Date()

        switch (calculationPeriod) {
            case 'MONTHLY':
                start.setMonth(now.getMonth() - 1)
                start.setDate(1)
                start.setHours(0, 0, 0, 0)
                const end = new Date(start)
                end.setMonth(start.getMonth() + 1)
                end.setDate(0) // Last day of the month
                end.setHours(23, 59, 59, 999)
                return { start, end }

            case 'WEEKLY':
                const dayOfWeek = now.getDay()
                start.setDate(now.getDate() - dayOfWeek - 7)
                start.setHours(0, 0, 0, 0)
                const weekEnd = new Date(start)
                weekEnd.setDate(start.getDate() + 6)
                weekEnd.setHours(23, 59, 59, 999)
                return { start, end: weekEnd }

            case 'DAILY':
                start.setDate(now.getDate() - 1)
                start.setHours(0, 0, 0, 0)
                const dayEnd = new Date(start)
                dayEnd.setHours(23, 59, 59, 999)
                return { start, end: dayEnd }

            default:
                return this.getPeriodDates('MONTHLY')
        }
    }
}

