import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor record for this user
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id },
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
            return sum + f.transactions.reduce((txSum, tx) => txSum + Number(tx.total), 0)
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
