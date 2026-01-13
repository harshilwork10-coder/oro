import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all locations with their terminal configurations
        // Only include locations that belong to franchises with valid franchisors
        const locations = await prisma.location.findMany({
            include: {
                franchise: {
                    select: {
                        name: true,
                        franchisorId: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Filter only locations with valid franchisors and format as terminals
        const terminals = locations
            .filter(location => location.franchise?.franchisorId && location.franchise?.franchisor)
            .map(location => ({
                id: location.id,
                locationId: location.id,
                location: {
                    id: location.id,
                    name: location.name,
                    franchise: {
                        name: location.franchise.name
                    }
                },
                paxTerminalIP: location.paxTerminalIP,
                paxTerminalPort: location.paxTerminalPort,
                processorName: location.processorName,
                processorMID: location.processorMID,
                processorTID: location.processorTID,
                updatedAt: location.updatedAt
            }))

        return NextResponse.json(terminals)
    } catch (error) {
        console.error('Error fetching terminal configurations:', error)
        return NextResponse.json({ error: 'Failed to fetch terminals' }, { status: 500 })
    }
}

