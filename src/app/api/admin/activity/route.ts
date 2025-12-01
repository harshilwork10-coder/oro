import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get recent platform activity
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get recent clients
        const recentClients = await prisma.franchisor.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Get recent locations
        const recentLocations = await prisma.location.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                address: true,
                createdAt: true,
                franchise: {
                    select: {
                        name: true,
                        franchisor: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        })

        // Get recent agents
        const recentAgents = await prisma.user.findMany({
            where: { role: 'AGENT' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
            }
        })

        // Combine and sort all activities
        const activities = [
            ...recentClients.map(c => ({
                id: `client-${c.id}`,
                type: 'client_added',
                title: `New client: ${c.name}`,
                description: `Owner: ${c.owner?.name || 'Unknown'}`,
                status: c.status,
                timestamp: c.createdAt
            })),
            ...recentLocations.map(l => ({
                id: `location-${l.id}`,
                type: 'location_added',
                title: `New location: ${l.name}`,
                description: `Client: ${l.franchise.franchisor.name}`,
                status: null,
                timestamp: l.createdAt
            })),
            ...recentAgents.map(a => ({
                id: `agent-${a.id}`,
                type: 'agent_added',
                title: `New agent: ${a.name}`,
                description: a.email,
                status: null,
                timestamp: a.createdAt
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20)

        return NextResponse.json({
            activities: activities.map(a => ({
                ...a,
                timestamp: a.timestamp.toISOString()
            }))
        })
    } catch (error) {
        console.error('Error fetching activity:', error)
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}
