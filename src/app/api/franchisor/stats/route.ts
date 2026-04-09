import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { sumRevenue } from '@/lib/utils/resolveTransactionRevenue'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor record for this user
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id },
            select: {
                id: true,
                name: true,
                approvalStatus: true,
                createdAt: true,
                franchises: {
                    include: {
                        locations: {
                            include: {
                                users: true
                            }
                        },
                        transactions: {
                            where: {
                                createdAt: {
                                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                                }
                            },
                            select: {
                                total: true,
                                totalCash: true,
                                chargedMode: true
                            }
                        }
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Calculate stats
        const totalLocations = franchisor.franchises.reduce((sum, f) => sum + f.locations.length, 0)
        const totalEmployees = franchisor.franchises.reduce((sum, f) => {
            return sum + f.locations.reduce((locSum, l) => locSum + l.users.length, 0)
        }, 0)

        const totalTransactions = franchisor.franchises.reduce((sum, f) => sum + f.transactions.length, 0)
        const monthlyRevenue = franchisor.franchises.reduce((sum, f) => {
            return sum + sumRevenue(f.transactions)
        }, 0)

        // Get recent activity (simplified for now)
        const recentActivity: any[] = []

        // Get count of franchisees (each franchise is a franchisee)
        const totalFranchisees = franchisor.franchises.length

        return NextResponse.json({
            approvalStatus: franchisor.approvalStatus,
            name: franchisor.name || 'Your Franchise',
            createdAt: franchisor.createdAt,
            totalFranchisees,
            totalLocations,
            totalEmployees,
            totalTransactions,
            monthlyRevenue,
            recentActivity
        })

    } catch (error) {
        console.error('Error fetching franchisor stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        )
    }
}

