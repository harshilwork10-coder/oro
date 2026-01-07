import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ClientRebookingSuggestion {
    client: {
        id: string
        firstName: string
        lastName: string
        phone: string | null
        email: string | null
    }
    lastVisit: Date
    daysSinceVisit: number
    avgVisitFrequency: number // days between visits
    isOverdue: boolean
    suggestedRebookDate: Date
    visitCount: number
    preferredService: {
        id: string
        name: string
    } | null
    preferredStaff: {
        id: string
        name: string
    } | null
}

// GET - Get clients who are due for rebooking
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const staffId = searchParams.get('staffId') || user.id
        const daysAhead = parseInt(searchParams.get('daysAhead') || '7') // How many days ahead to look
        const limit = parseInt(searchParams.get('limit') || '20')

        // Get completed appointments for this staff member's clients
        const appointments = await prisma.appointment.findMany({
            where: {
                employeeId: staffId,
                status: 'COMPLETED'
            },
            include: {
                client: true,
                service: true
            },
            orderBy: { startTime: 'desc' }
        })

        // Group by client and calculate visit patterns
        const clientVisits: Map<string, {
            client: any
            visits: Date[]
            services: string[]
            staffId: string
        }> = new Map()

        for (const apt of appointments) {
            const existing = clientVisits.get(apt.clientId)
            if (existing) {
                existing.visits.push(apt.startTime)
                if (!existing.services.includes(apt.serviceId)) {
                    existing.services.push(apt.serviceId)
                }
            } else {
                clientVisits.set(apt.clientId, {
                    client: apt.client,
                    visits: [apt.startTime],
                    services: [apt.serviceId],
                    staffId: apt.employeeId
                })
            }
        }

        const suggestions: ClientRebookingSuggestion[] = []
        const now = new Date()

        for (const [clientId, data] of clientVisits) {
            const visits = data.visits.sort((a, b) => b.getTime() - a.getTime())

            if (visits.length < 1) continue

            const lastVisit = visits[0]
            const daysSinceVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

            // Calculate average visit frequency
            let avgFrequency = 30 // default 30 days if only 1 visit
            if (visits.length >= 2) {
                const totalDays = (visits[0].getTime() - visits[visits.length - 1].getTime()) / (1000 * 60 * 60 * 24)
                avgFrequency = Math.round(totalDays / (visits.length - 1))
            }

            // Determine if overdue (visited more than average frequency + buffer)
            const buffer = Math.round(avgFrequency * 0.2) // 20% buffer
            const isOverdue = daysSinceVisit > (avgFrequency + buffer)

            // Calculate suggested rebook date
            const suggestedDate = new Date(lastVisit)
            suggestedDate.setDate(suggestedDate.getDate() + avgFrequency)

            // Only include if due within the next N days or already overdue
            const daysUntilDue = Math.floor((suggestedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (daysUntilDue <= daysAhead || isOverdue) {
                // Get most used service
                const mostUsedServiceId = data.services[0]
                const service = await prisma.service.findUnique({
                    where: { id: mostUsedServiceId },
                    select: { id: true, name: true }
                })

                // Get staff info
                const staff = await prisma.user.findUnique({
                    where: { id: data.staffId },
                    select: { id: true, name: true }
                })

                suggestions.push({
                    client: {
                        id: data.client.id,
                        firstName: data.client.firstName,
                        lastName: data.client.lastName,
                        phone: data.client.phone,
                        email: data.client.email
                    },
                    lastVisit,
                    daysSinceVisit,
                    avgVisitFrequency: avgFrequency,
                    isOverdue,
                    suggestedRebookDate: suggestedDate,
                    visitCount: visits.length,
                    preferredService: service,
                    preferredStaff: staff ? { id: staff.id, name: staff.name || '' } : null
                })
            }
        }

        // Sort by overdue first, then by days since visit
        suggestions.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1
            if (!a.isOverdue && b.isOverdue) return 1
            return b.daysSinceVisit - a.daysSinceVisit
        })

        return NextResponse.json({
            suggestions: suggestions.slice(0, limit),
            total: suggestions.length,
            overdueCount: suggestions.filter(s => s.isOverdue).length,
            upcomingCount: suggestions.filter(s => !s.isOverdue).length
        })
    } catch (error) {
        console.error('Error fetching rebooking suggestions:', error)
        return NextResponse.json({ error: 'Failed to fetch rebooking suggestions' }, { status: 500 })
    }
}
