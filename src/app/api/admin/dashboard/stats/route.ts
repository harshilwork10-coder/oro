import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!session || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all statistics in parallel
        const [
            totalFranchisors,
            totalFranchises,
            totalLocations,
            recentActivity
        ] = await Promise.all([
            // Total Franchisors (clients)
            prisma.franchisor.count(),

            // Total Franchises
            prisma.franchise.count(),

            // Total Locations
            prisma.location.count(),

            // Recent Activity - last 10 franchisors created
            prisma.franchisor.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    owner: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            franchises: true
                        }
                    }
                }
            })
        ])

        // Total employees - set to 0 since Employee model doesn't exist yet
        const totalEmployees = 0

        // Calculate stats
        const stats = {
            totalFranchisors,
            totalFranchises,
            totalLocations,
            totalEmployees,
            monthlyRevenue: 0, // TODO: Calculate from transactions
            recentActivity: recentActivity.map((f: any) => ({
                id: f.id,
                type: 'franchisor',
                title: 'New client added',
                description: f.name || 'Unnamed Client',
                timestamp: f.createdAt,
                meta: {
                    franchiseCount: f._count.franchises,
                    ownerName: f.owner?.name,
                    ownerEmail: f.owner?.email
                }
            }))
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}

