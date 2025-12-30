import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q') || ''

        if (query.length < 2) {
            return NextResponse.json({ results: [] })
        }

        const results: { title: string | null; description: string | null | undefined; type: string; href: string }[] = []
        const user = session.user as { role?: string }

        // Search clients
        if (user.role === 'PROVIDER') {
            const clients = await prisma.franchisor.findMany({
                where: {
                    OR: [
                        { name: { contains: query } },
                        { owner: { email: { contains: query } } }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    owner: { select: { email: true } }
                }
            })

            results.push(...clients.map(c => ({
                title: c.name,
                description: c.owner?.email,
                type: 'Client',
                href: `/dashboard/franchisors`
            })))

            // Search locations
            const locations = await prisma.location.findMany({
                where: {
                    OR: [
                        { name: { contains: query } },
                        { address: { contains: query } }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    address: true
                }
            })

            results.push(...locations.map(l => ({
                title: l.name,
                description: l.address,
                type: 'Location',
                href: `/dashboard/locations`
            })))

            // Search agents
            const agents = await prisma.user.findMany({
                where: {
                    role: 'AGENT',
                    OR: [
                        { name: { contains: query } },
                        { email: { contains: query } }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            })

            results.push(...agents.map(a => ({
                title: a.name || a.email,
                description: a.email,
                type: 'Agent',
                href: `/dashboard/team`
            })))
        }

        return NextResponse.json({ results: results.slice(0, 10) })
    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}

