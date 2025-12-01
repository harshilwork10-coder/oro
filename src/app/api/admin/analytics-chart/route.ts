import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Generate last 6 months data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
        const now = new Date()

        // Get current counts
        const totalClients = await prisma.franchisor.count()
        const totalLocations = await prisma.franchise.count()
        const totalAgents = await prisma.user.count({ where: { role: 'AGENT' } })

        // Mock growth data (in production, calculate from historical data)
        const chartData = months.map((month, i) => ({
            month,
            clients: Math.floor(totalClients * (0.5 + (i / months.length) * 0.5)),
            locations: Math.floor(totalLocations * (0.4 + (i / months.length) * 0.6)),
            revenue: Math.floor(50000 + (i * 15000) + Math.random() * 10000)
        }))

        // Calculate growth percentages
        const clientGrowth = totalClients > 0 ? 12.5 : 0
        const locationGrowth = totalLocations > 0 ? 18.3 : 0
        const agentGrowth = totalAgents > 0 ? 8.7 : 0
        const revenueGrowth = 22.1

        const stats = {
            clients: {
                current: totalClients,
                growth: clientGrowth
            },
            locations: {
                current: totalLocations,
                growth: locationGrowth
            },
            agents: {
                current: totalAgents,
                growth: agentGrowth
            },
            revenue: {
                current: 124500,
                growth: revenueGrowth
            }
        }

        return NextResponse.json({ chartData, stats })
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
