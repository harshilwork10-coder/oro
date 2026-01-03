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

        // Get all franchisors with their business configuration
        const franchisors = await prisma.franchisor.findMany({
            select: {
                id: true,
                name: true,
                businessType: true,
                approvalStatus: true,
                createdAt: true,
                _count: {
                    select: {
                        franchises: true
                    }
                }
            }
        })

        // Calculate metrics
        const approvedFranchisors = franchisors.filter(f => f.approvalStatus === 'APPROVED')
        const pendingCount = franchisors.filter(f => f.approvalStatus === 'PENDING').length
        const rejectedCount = franchisors.filter(f => f.approvalStatus === 'REJECTED').length

        // Count by business type
        const brandAccounts = approvedFranchisors.filter(f => f.businessType === 'BRAND_FRANCHISOR')
        const multiLocationAccounts = approvedFranchisors.filter(f => f.businessType === 'MULTI_LOCATION_OWNER')

        // Growth calculation (comparing to last month - simplified)
        const thisMonthAccounts = approvedFranchisors.filter(f => {
            const createdDate = new Date(f.createdAt)
            const now = new Date()
            const thisMonth = now.getMonth()
            const thisYear = now.getFullYear()
            return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
        }).length

        const growthRate = approvedFranchisors.length > 0
            ? ((thisMonthAccounts / approvedFranchisors.length) * 100)
            : 0

        // Total locations across all franchisors
        const totalLocations = approvedFranchisors.reduce((sum, f) => sum + (f._count.franchises || 0), 0)

        return NextResponse.json({
            overview: {
                totalMRR: 0, // MRR tracking not implemented yet
                activeAccounts: approvedFranchisors.length,
                totalCommission: 0, // Commission tracking not implemented yet
                growthRate,
                pendingCount,
                rejectedCount,
                totalLocations
            },
            breakdown: {
                brand: {
                    count: brandAccounts.length,
                    mrr: 0
                },
                multiLocation: {
                    count: multiLocationAccounts.length,
                    mrr: 0
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
                    return createdDate <= date && f.approvalStatus === 'APPROVED'
                }).length

                return {
                    month,
                    mrr: 0,
                    accounts: accountsUpToMonth
                }
            })
        })
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}

