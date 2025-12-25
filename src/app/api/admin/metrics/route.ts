import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        // SECURITY: Require authentication
        const session = await getServerSession(authOptions)
        if (!session?.user || !['PROVIDER', 'ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get total clients (Franchisors)
        const totalClients = await prisma.franchisor.count()

        // Get total locations across all clients
        const totalLocations = await prisma.franchise.count()

        // Get clients by agent (for now, just return empty since schema not updated yet)
        const agents = await prisma.user.findMany({
            where: {
                role: 'AGENT'
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        const byAgent = agents.map(agent => ({
            agentId: agent.id,
            agentName: agent.name || agent.email,
            clientsCount: 0, // TODO: Count referredClients once schema updated
            locationsCount: 0 // TODO: Sum locations once schema updated
        }))

        // Recent activity
        const recentClients = await prisma.franchisor.findMany({
            take: 5,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                businessType: true,
                approvalStatus: true,
                createdAt: true,
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            totals: {
                clients: totalClients,
                locations: totalLocations,
                agents: agents.length
            },
            byAgent,
            recentClients: recentClients.map(c => ({
                ...c,
                createdAt: c.createdAt.toISOString()
            }))
        })
    } catch (error) {
        console.error('Error fetching metrics:', error)
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }
}
