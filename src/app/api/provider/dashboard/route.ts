import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/provider/dashboard
 *
 * Provider Operating System dashboard — single query endpoint.
 *
 * Answers in one fetch:
 *   1. What is broken? → offlineDevices, activeIncidents
 *   2. What is blocked? → provisioningBlocked, waitingDocs
 *   3. What needs intervention NOW? → slaBreached tickets, unassigned onboarding
 *   4. Which locations are at risk? → highDeclineLocations, suspendedLocations
 *   5. What work is falling behind? → onboarding age, ticket SLA
 *
 * Returns:
 *   stats{}, onboardingQueue[], ticketQueue[], provisioningQueue[],
 *   networkHealth{}, fetchedAt
 */
export async function GET(req: NextRequest) {
    const fetchedAt = new Date()

    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Provider access required' }, { status: 403 })
        }

        // ── Parallel queries ────────────────────────────────────────────
        const [
            onboardingPending,
            waitingDocs,
            hardwareApproved,
            shipmentsReady,
            offlineDevices,
            totalTerminals,
            openTickets,
            slaBreached,
            p1Tickets,
            totalFranchisors,
            totalLocations,
            activeLocations,
            suspendedLocations,
            activeIncidents,
            provisioningPending,
            unassignedOnboarding,
            recentOnboarding,
            recentTickets,
            recentProvisioning,
        ] = await Promise.all([
            // Onboarding counts
            prisma.onboardingRequest.count({ where: { status: { in: [1, 2] } } }),
            prisma.onboardingRequest.count({ where: { status: 3 } }),
            prisma.onboardingRequest.count({ where: { status: 4 } }),
            prisma.shipment.count({ where: { status: 2 } }).catch(() => 0),

            // Device health
            prisma.terminal.count({ where: { status: 'OFFLINE' } }).catch(() => 0),
            prisma.terminal.count().catch(() => 0),

            // Ticket health
            prisma.ticket.count({ where: { status: { in: ['OPEN', 'PENDING'] } } }),
            prisma.ticket.count({
                where: {
                    status: { in: ['OPEN', 'PENDING'] },
                    slaDueAt: { lt: new Date() },
                },
            }),
            prisma.ticket.count({
                where: { status: { in: ['OPEN', 'PENDING'] }, severity: 'P1' },
            }),

            // Network scale
            prisma.franchisor.count(),
            prisma.location.count(),
            prisma.location.count({
                where: { provisioningStatus: 'ACTIVE' },
            }).catch(() => 0),
            prisma.location.count({
                where: { provisioningStatus: 'SUSPENDED' },
            }).catch(() => 0),

            // Active incidents (system-wide)
            prisma.incident.count({
                where: { status: { not: 'RESOLVED' } },
            }).catch(() => 0),

            // Provisioning tasks pending
            prisma.locationProvisioningTask.count({
                where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            }).catch(() => 0),

            // Unassigned onboarding (no agent)
            prisma.onboardingRequest.count({
                where: { status: { in: [1, 2, 3] }, assignedToUserId: null },
            }),

            // ── Queue data ──────────────────────────────────────────────
            // Onboarding queue (top 10, newest first)
            prisma.onboardingRequest.findMany({
                where: { status: { not: 6 } }, // not ACTIVE
                take: 10,
                orderBy: { submittedAt: 'desc' },
                include: {
                    franchisor: { select: { name: true } },
                    assignedToUser: { select: { name: true } },
                },
            }),

            // Ticket queue (P1 first, then SLA urgency)
            prisma.ticket.findMany({
                where: { status: { in: ['OPEN', 'PENDING'] } },
                take: 10,
                orderBy: [{ severity: 'asc' }, { slaDueAt: 'asc' }],
                include: {
                    location: { select: { name: true } },
                    franchise: { select: { name: true } },
                },
            }),

            // Provisioning queue (pending tasks)
            prisma.locationProvisioningTask.findMany({
                where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    location: { select: { name: true, provisioningStatus: true } },
                    franchisor: {
                        select: { name: true, owner: { select: { name: true } } },
                    },
                },
            }).catch(() => []),
        ])

        // ── Transform for frontend ──────────────────────────────────────
        const stats = {
            // KPIs
            onboardingPending: onboardingPending + waitingDocs,
            docsMissing: waitingDocs,
            hardwareToAssign: hardwareApproved,
            shipmentsToSend: shipmentsReady,
            offlineDevices,
            totalTerminals,
            highDeclineLocations: 0, // Future: payment monitoring
            openTickets,
            slaAtRisk: slaBreached,
            p1Tickets,
            billingPastDue: 0, // Deferred until billing engine
            // Network
            totalFranchisors,
            totalLocations,
            activeLocations,
            suspendedLocations,
            // Incidents & provisioning
            activeIncidents,
            provisioningPending,
            unassignedOnboarding,
        }

        const typeLabels = ['', 'New Franchisee', 'Add Location', 'Device Change']
        const statusLabels = [
            '',
            'submitted',
            'in-review',
            'waiting-docs',
            'approved',
            'shipped',
            'active',
            'rejected',
        ]

        const onboardingQueue = recentOnboarding.map((req) => ({
            id: req.requestNumber,
            type: typeLabels[req.requestType] || 'Other',
            client: req.franchisor?.name || req.contactName || 'Unknown',
            status: statusLabels[req.status] || 'unknown',
            age:
                Math.floor(
                    (Date.now() - new Date(req.submittedAt).getTime()) / (1000 * 60 * 60 * 24),
                ) + 'd',
            agent: req.assignedToUser?.name || null,
        }))

        const ticketQueue = recentTickets.map((ticket) => ({
            id: ticket.publicId,
            priority: ticket.severity,
            client: ticket.franchise?.name || 'Unknown',
            location: ticket.location?.name || 'Unknown',
            category: ticket.category || 'Support',
            status: ticket.status.toLowerCase(),
            sla: ticket.slaDueAt
                ? (() => {
                      const diff = new Date(ticket.slaDueAt).getTime() - Date.now()
                      if (diff < 0) return 'BREACHED'
                      const hours = Math.floor(diff / (1000 * 60 * 60))
                      if (hours < 24) return `${hours}h left`
                      return `${Math.floor(hours / 24)}d left`
                  })()
                : 'N/A',
        }))

        const provisioningQueue = (recentProvisioning as any[]).map((task) => ({
            id: task.id,
            locationName: task.location?.name || 'Unknown',
            locationStatus: task.location?.provisioningStatus || 'UNKNOWN',
            franchisor: task.franchisor?.name || task.franchisor?.owner?.name || 'Unknown',
            status: task.status,
            devices: task.requestedDevicesCount || 0,
            age:
                Math.floor(
                    (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24),
                ) + 'd',
        }))

        // ── Network health summary ──────────────────────────────────────
        const networkHealth = {
            devicesOnline: totalTerminals - offlineDevices,
            devicesTotal: totalTerminals,
            uptimePercent:
                totalTerminals > 0
                    ? (((totalTerminals - offlineDevices) / totalTerminals) * 100).toFixed(1)
                    : '100.0',
            activeIncidents,
            locationsAtRisk: suspendedLocations,
        }

        return NextResponse.json({
            stats,
            onboardingQueue,
            ticketQueue,
            provisioningQueue,
            networkHealth,
            fetchedAt: fetchedAt.toISOString(),
        })
    } catch (error) {
        console.error('[PROVIDER_DASHBOARD]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
