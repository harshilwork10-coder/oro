import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const tickets = await prisma.ticket.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                location: true,
                assignedToUser: true,
                createdByUser: true,
                franchise: true,
                messages: {
                    include: {
                        authorUser: true
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        return NextResponse.json(tickets)
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { subject, description, priority, category } = body

        if (!subject || !description) {
            return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 })
        }

        // Map priority to severity (P0-P4 format)
        const severityMap: Record<string, string> = {
            'CRITICAL': 'P0',
            'HIGH': 'P1',
            'MEDIUM': 'P2',
            'LOW': 'P3'
        }
        const severity = severityMap[priority] || 'P2'

        // Get any franchise and its first location
        const franchise = await prisma.franchise.findFirst({
            include: { locations: { take: 1 } }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'No franchise found in system' }, { status: 400 })
        }

        let locationId = franchise.locations[0]?.id

        // If no location exists, create one
        if (!locationId) {
            const newLocation = await prisma.location.create({
                data: {
                    name: 'Support Location',
                    slug: `support-${Date.now()}`,
                    franchiseId: franchise.id
                }
            })
            locationId = newLocation.id
        }

        // Create the ticket
        const ticket = await prisma.ticket.create({
            data: {
                franchiseId: franchise.id,
                locationId: locationId,
                subject,
                severity,
                category: category || 'OTHER',
                status: 'OPEN',
                createdByUserId: session.user.id
            }
        })

        // Create initial message with description (field is "message", not "content")
        await prisma.ticketMessage.create({
            data: {
                ticketId: ticket.id,
                message: description,
                authorUserId: session.user.id,
                isInternal: false
            }
        })

        return NextResponse.json({
            success: true,
            ticket,
            message: 'Ticket created successfully'
        })
    } catch (error: any) {
        console.error('Error creating ticket:', error)
        return NextResponse.json({
            error: 'Failed to create ticket',
            details: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}
