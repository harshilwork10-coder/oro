import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Get all franchisors (active and archived)
        const franchisors = await prisma.franchisor.findMany({
            select: {
                id: true,
                type: true,
                supportFee: true,
                baseRate: true,
                enableCommission: true,
                deletedAt: true,
                salesAgentId: true,
                createdAt: true,
                _count: {
                    select: {
                        franchises: true
                    }
                }
            }
        })

        // Calculate metrics
        const activeFranchisors = franchisors.filter(f => !f.deletedAt)
        const archivedCount = franchisors.filter(f => f.deletedAt).length

        // Count by type
        const brandAccounts = activeFranchisors.filter(f => f.type === 'BRAND')
        const individualAccounts = activeFranchisors.filter(f => f.type === 'INDIVIDUAL')

        // Calculate MRR (Monthly Recurring Revenue)
        const totalMRR = activeFranchisors.reduce((sum, f) => sum + Number(f.supportFee || 0), 0)
        const brandMRR = brandAccounts.reduce((sum, f) => sum + Number(f.supportFee || 0), 0)
        const individualMRR = individualAccounts.reduce((sum, f) => sum + Number(f.supportFee || 0), 0)

        // Calculate commission payable
        const totalCommission = activeFranchisors.reduce((sum, f) => {
            if (!f.enableCommission || !f.salesAgentId) return sum
            const markup = Number(f.supportFee || 0) - Number(f.baseRate || 99)
            return sum + Math.max(0, markup)
        }, 0)

        // Growth calculation (comparing to last month - simplified)
        const thisMonthAccounts = activeFranchisors.filter(f => {
            const createdDate = new Date(f.createdAt)
            const now = new Date()
            const thisMonth = now.getMonth()
            const thisYear = now.getFullYear()
            return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
        }).length

        const growthRate = activeFranchisors.length > 0
            ? ((thisMonthAccounts / activeFranchisors.length) * 100)
            : 0

        // Total locations across all franchisors
        const totalLocations = activeFranchisors.reduce((sum, f) => sum + (f._count.franchises || 0), 0)

        return NextResponse.json({
            overview: {
                totalMRR,
                activeAccounts: activeFranchisors.length,
                totalCommission,
                growthRate,
                archivedCount,
                totalLocations
            },
            breakdown: {
                brand: {
                    count: brandAccounts.length,
                    mrr: brandMRR
                },
                individual: {
                    count: individualAccounts.length,
                    mrr: individualMRR
                }
            },
            // Simple monthly trend (last 6 months)
            trend: Array.from({ length: 6 }, (_, i) => {
                const date = new Date()
                date.setMonth(date.getMonth() - (5 - i))
                const month = date.toLocaleDateString('en-US', { month: 'short' })

                // Count accounts created before or during this month
                const accountsUpToMonth = franchisors.filter(f => {
                    const createdDate = new Date(f.createdAt)
                    return createdDate <= date && !f.deletedAt
                }).length

                // Calculate MRR for accounts up to this month
                const mrrUpToMonth = franchisors.filter(f => {
                    const createdDate = new Date(f.createdAt)
                    return createdDate <= date && !f.deletedAt
                }).reduce((sum, f) => sum + Number(f.supportFee || 0), 0)

                return {
                    month,
                    mrr: mrrUpToMonth,
                    accounts: accountsUpToMonth
                }
            })
        })
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
