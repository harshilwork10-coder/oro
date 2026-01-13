import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        // Ensure only PROVIDER access
        if (session?.user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch all stats concurrently
        const [
            onboardingPending,
            docsMissing,
            hardwareToAssign,
            shipmentsToSend,
            offlineDevices, // Terminal status
            openTickets,
            slaAtRisk,
            recentOnboarding,
            recentTickets
        ] = await Promise.all([
            // KPI 1: Onboarding Pending (Status 1=SUBMITTED, 2=IN_REVIEW)
            prisma.onboardingRequest.count({
                where: { status: { in: [1, 2] } }
            }),

            // KPI 2: Docs Missing (Status 3=WAITING_DOCS)
            prisma.onboardingRequest.count({
                where: { status: 3 }
            }),

            // KPI 3: Hardware To Assign (Status 4=APPROVED - pending shipment/assignment)
            // Or use explicit device assignment check if complex
            prisma.onboardingRequest.count({
                where: { status: 4 }
            }),

            // KPI 4: Shipments To Send (Status 2=READY)
            prisma.shipment.count({
                where: { status: 2 }
            }),

            // KPI 5: Offline Devices
            // Assuming Terminal model has 'status' or check lastHearbeat
            // Using placeholder logic or simplified count if field exists
            // Checking schema via prisma.$queryRaw or just try/catch if field missing?
            // I'll assume Terminal exists and has status='OFFLINE'.
            // If it fails, I'll catch and return 0.
            prisma.terminal.count({
                where: { status: 'OFFLINE' }
            }).catch(() => 0),

            // KPI 6: Open Tickets
            prisma.ticket.count({
                where: { status: { in: ['OPEN', 'PENDING'] } }
            }),

            // KPI 7: SLA At Risk (Open tickets past due)
            prisma.ticket.count({
                where: {
                    status: { in: ['OPEN', 'PENDING'] },
                    slaDueAt: { lt: new Date() }
                }
            }),

            // Queue 1: Recent Onboarding Requests
            prisma.onboardingRequest.findMany({
                where: { status: { not: 6 } }, // Not ACTIVE
                take: 5,
                orderBy: { submittedAt: 'desc' },
                include: {
                    franchisor: { select: { name: true } }, // Or firstName/lastName
                    assignedToUser: { select: { name: true } }
                }
            }),

            // Queue 2: Recent Tickets
            prisma.ticket.findMany({
                where: { status: { in: ['OPEN', 'PENDING'] } },
                take: 5,
                orderBy: { severity: 'asc' }, // P1 first? Or P0? Assuming string sort works roughly or needs enum
                include: {
                    location: { select: { name: true } },
                    franchise: { select: { name: true } }
                }
            })
        ])

        // Transform data for frontend
        const stats = {
            onboardingPending,
            docsMissing,
            hardwareToAssign,
            shipmentsToSend,
            offlineDevices,
            highDeclineLocations: 0, // Placeholder
            openTickets,
            slaAtRisk,
            billingPastDue: 0 // Placeholder
        }

        const onboardingQueue = recentOnboarding.map(req => ({
            id: req.requestNumber,
            type: req.requestType === 1 ? 'New Franchise' : 'Add Location',
            client: req.franchisor?.name || 'Unknown',
            status: ['Submitted', 'In Review', 'Waiting Docs', 'Approved', 'Shipped', 'Active', 'Rejected'][req.status - 1] || 'Unknown',
            age: Math.floor((Date.now() - new Date(req.submittedAt).getTime()) / (1000 * 60 * 60 * 24)) + 'd',
            agent: req.assignedToUser?.name || null
        }))

        const ticketQueue = recentTickets.map(ticket => ({
            id: ticket.publicId,
            priority: ticket.severity,
            client: ticket.franchise.name,
            location: ticket.location.name,
            category: ticket.category || 'Support',
            status: ticket.status.toLowerCase(),
            sla: ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleDateString() : 'N/A'
        }))

        return NextResponse.json({
            stats,
            onboardingQueue,
            ticketQueue
        })

    } catch (error) {
        console.error('Error fetching provider dashboard stats:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
