import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingRequestSMS } from '@/lib/sms'
import {
    checkRateLimit,
    getRateLimitKey,
    isValidEmail,
    isValidPhone,
    sanitizeInput,
    RATE_LIMITS
} from '@/lib/rateLimit'

interface GroupMember {
    name: string
    serviceId: string
}

// POST - Create a booking (supports group booking)
export async function POST(request: NextRequest) {
    try {
        // Rate limiting - max 5 bookings per 5 minutes per IP
        const rateLimitKey = getRateLimitKey(request, 'booking')
        const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.booking)

        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: 'Too many booking attempts. Please try again later.',
                retryAfter: Math.ceil(rateLimit.resetIn / 1000)
            }, {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) }
            })
        }

        const body = await request.json()
        const {
            franchiseId,
            locationId,
            serviceId,
            staffId,
            dateTime,
            customerName,
            customerEmail,
            customerPhone,
            notes,
            groupMembers = [] as GroupMember[] // NEW: Array of group members
        } = body

        // Validate required fields
        if (!locationId || !serviceId || !dateTime || !customerName || !customerEmail) {
            return NextResponse.json({
                error: 'Missing required fields: locationId, serviceId, dateTime, customerName, customerEmail'
            }, { status: 400 })
        }

        // Validate email format
        if (!isValidEmail(customerEmail)) {
            return NextResponse.json({
                error: 'Invalid email format'
            }, { status: 400 })
        }

        // Validate phone if provided  
        if (customerPhone && !isValidPhone(customerPhone)) {
            return NextResponse.json({
                error: 'Invalid phone number format'
            }, { status: 400 })
        }

        // NEW: Validate group members
        for (const member of groupMembers) {
            if (!member.name || !member.serviceId) {
                return NextResponse.json({
                    error: 'All group members must have a name and service selected'
                }, { status: 400 })
            }
        }

        // Sanitize text inputs
        const cleanName = sanitizeInput(customerName)
        const cleanNotes = notes ? sanitizeInput(notes) : null

        // Verify location exists and get franchiseId from it
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Use franchiseId from location (don't trust client input)
        const verifiedFranchiseId = location.franchiseId

        // Find or create client for primary booker
        let client = await prisma.client.findFirst({
            where: {
                franchiseId: verifiedFranchiseId,
                OR: [
                    { email: customerEmail },
                    ...(customerPhone ? [{ phone: customerPhone }] : [])
                ]
            }
        })

        if (!client) {
            const nameParts = cleanName.split(' ')
            const firstName = nameParts[0]
            const lastName = nameParts.slice(1).join(' ') || ''

            client = await prisma.client.create({
                data: {
                    franchiseId: verifiedFranchiseId,
                    firstName,
                    lastName,
                    email: customerEmail,
                    phone: customerPhone || null
                }
            })
        }

        // Get primary service for duration
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            select: { duration: true, name: true, price: true }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        // Get all group member services
        const memberServices = await prisma.service.findMany({
            where: { id: { in: groupMembers.map((m: GroupMember) => m.serviceId) } },
            select: { id: true, duration: true, name: true, price: true }
        })
        const serviceMap = new Map(memberServices.map(s => [s.id, s]))

        // Calculate total duration for all bookings
        let totalDuration = service.duration
        for (const member of groupMembers) {
            const memberService = serviceMap.get(member.serviceId)
            if (memberService) {
                totalDuration += memberService.duration
            }
        }

        // Calculate times
        const startTime = new Date(dateTime)
        const primaryEndTime = new Date(startTime.getTime() + service.duration * 60000)

        // Check for conflicts for primary booking
        const conflict = await prisma.appointment.findFirst({
            where: {
                locationId,
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                OR: [
                    {
                        startTime: { lt: primaryEndTime },
                        endTime: { gt: startTime }
                    }
                ],
                ...(staffId ? { employeeId: staffId } : {})
            }
        })

        if (conflict) {
            return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
        }

        // Get a staff member if not specified
        let assignedStaffId = staffId
        if (!assignedStaffId) {
            const availableStaff = await prisma.user.findFirst({
                where: {
                    franchiseId,
                    role: { in: ['EMPLOYEE', 'MANAGER'] }
                }
            })
            assignedStaffId = availableStaff?.id
        }

        if (!assignedStaffId) {
            return NextResponse.json({ error: 'No staff available' }, { status: 400 })
        }

        // Generate groupBookingId for linked appointments
        const isGroupBooking = groupMembers.length > 0
        const groupBookingId = isGroupBooking ? `grp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` : null

        // Create primary appointment
        const primaryAppointment = await prisma.appointment.create({
            data: {
                clientId: client.id,
                employeeId: assignedStaffId,
                serviceId,
                locationId,
                startTime,
                endTime: primaryEndTime,
                status: 'PENDING_APPROVAL',
                notes: cleanNotes,
                groupBookingId,
                groupPosition: isGroupBooking ? 1 : null
            },
            include: {
                service: { select: { name: true, price: true } },
                employee: { select: { name: true } },
                location: { select: { name: true, address: true } }
            }
        })

        // Create appointments for group members
        const groupAppointments = []
        let currentStartTime = primaryEndTime // Chain appointments one after another

        for (let i = 0; i < groupMembers.length; i++) {
            const member = groupMembers[i]
            const memberService = serviceMap.get(member.serviceId)
            if (!memberService) continue

            const memberEndTime = new Date(currentStartTime.getTime() + memberService.duration * 60000)
            const memberNameParts = sanitizeInput(member.name).split(' ')

            // Create or find client for group member (minimal record)
            const memberClient = await prisma.client.create({
                data: {
                    franchiseId: verifiedFranchiseId,
                    firstName: memberNameParts[0] || 'Guest',
                    lastName: memberNameParts.slice(1).join(' ') || '',
                    email: null, // Group members don't need email
                    phone: null
                }
            })

            const memberAppointment = await prisma.appointment.create({
                data: {
                    clientId: memberClient.id,
                    employeeId: assignedStaffId,
                    serviceId: member.serviceId,
                    locationId,
                    startTime: currentStartTime,
                    endTime: memberEndTime,
                    status: 'PENDING_APPROVAL',
                    notes: `Group booking with ${cleanName}`,
                    groupBookingId,
                    groupPosition: i + 2 // 2, 3, 4, etc.
                },
                include: {
                    service: { select: { name: true, price: true } }
                }
            })

            groupAppointments.push({
                id: memberAppointment.id,
                name: member.name,
                service: memberAppointment.service.name,
                price: Number(memberAppointment.service.price),
                time: currentStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            })

            currentStartTime = memberEndTime // Next appointment starts when this ends
        }

        // Send SMS notification if customer has phone
        if (customerPhone && location) {
            const totalPeople = 1 + groupMembers.length
            await sendBookingRequestSMS(customerPhone, franchiseId, {
                customerName,
                businessName: location.franchise.name,
                serviceName: totalPeople > 1 ? `${service.name} + ${groupMembers.length} more` : service.name,
                date: startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            })
        }

        // Calculate total price
        const totalPrice = Number(service.price) + groupAppointments.reduce((sum, a) => sum + a.price, 0)

        return NextResponse.json({
            success: true,
            pendingApproval: true,
            isGroupBooking,
            groupBookingId,
            appointment: {
                id: primaryAppointment.id,
                service: primaryAppointment.service.name,
                staff: primaryAppointment.employee.name,
                location: primaryAppointment.location.name,
                address: primaryAppointment.location.address,
                date: startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                price: Number(primaryAppointment.service.price)
            },
            groupMembers: groupAppointments,
            totalPrice,
            totalPeople: 1 + groupMembers.length
        })
    } catch (error) {
        console.error('Error creating booking:', error)
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }
}


