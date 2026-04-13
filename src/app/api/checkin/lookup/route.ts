/**
 * POST /api/checkin/lookup
 * 
 * Public endpoint — called from the customer's phone after QR scan.
 * Looks up a customer by phone number at a specific location (via slug),
 * returns masked appointment data for today.
 * 
 * Security:
 * - Rate limited: 10 requests/minute/IP
 * - Slug-scoped: Only returns data for the specified location
 * - Masked PII: First name truncated, no last name, no full phone
 * - No internal IDs except appointmentId (needed for check-in binding)
 * 
 * Body: { phone: string, slug: string }
 * Returns: { found: boolean, clientFirstName?: string, appointments?: [...] }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, getClientIP } from '@/lib/security'

export async function POST(request: Request) {
    try {
        // Rate limit: 10 lookups/minute/IP — prevents phone enumeration
        const ip = getClientIP(request)
        const rateLimitResponse = await applyRateLimit(
            `checkin-lookup:${ip}`,
            { maxAttempts: 10, windowMs: 60000 }
        )
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { phone, slug } = body

        if (!phone || !slug) {
            return NextResponse.json(
                { error: 'Phone and location slug are required' },
                { status: 400 }
            )
        }

        // Resolve slug → location → franchise
        const location = await prisma.location.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                franchiseId: true,
                businessType: true
            }
        })

        if (!location) {
            return NextResponse.json(
                { error: 'Location not found' },
                { status: 404 }
            )
        }

        // Normalize phone — strip formatting characters
        const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '')

        // Find client by phone within this franchise
        const client = await prisma.client.findFirst({
            where: {
                phone: normalizedPhone,
                franchiseId: location.franchiseId
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                liabilitySigned: true,
                loyaltyJoined: true
            }
        })

        if (!client) {
            // Customer not found — caller should show name-entry form
            return NextResponse.json({
                found: false,
                locationName: location.name,
                locationId: location.id
            })
        }

        // Mask first name: show first char + asterisks (e.g., "J***")
        const maskedFirstName = client.firstName
            ? client.firstName.charAt(0) + '***'
            : '****'

        // Find today's appointments at this location for this client
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const appointments = await prisma.appointment.findMany({
            where: {
                clientId: client.id,
                locationId: location.id,
                startTime: { gte: today, lt: tomorrow },
                status: { in: ['SCHEDULED', 'CONFIRMED'] }
            },
            select: {
                id: true,
                startTime: true,
                status: true,
                service: {
                    select: { name: true }
                },
                employee: {
                    select: { name: true }
                }
            },
            orderBy: { startTime: 'asc' }
        })

        // Format appointments with masked data
        const formattedAppointments = appointments.map(appt => ({
            id: appt.id,
            time: appt.startTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }),
            service: appt.service.name,
            stylist: appt.employee.name || 'Staff',
            status: appt.status
        }))

        // Check if already checked in today
        const existingCheckIn = await prisma.checkIn.findFirst({
            where: {
                clientId: client.id,
                locationId: location.id,
                checkedInAt: { gte: today, lt: tomorrow },
                status: { in: ['WAITING', 'IN_SERVICE', 'SERVED'] }
            }
        })

        return NextResponse.json({
            found: true,
            clientId: client.id,
            clientFirstName: maskedFirstName,
            liabilitySigned: client.liabilitySigned,
            loyaltyJoined: client.loyaltyJoined,
            alreadyCheckedIn: !!existingCheckIn,
            locationName: location.name,
            locationId: location.id,
            appointments: formattedAppointments
        })

    } catch (error) {
        console.error('[checkin/lookup] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
