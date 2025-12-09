import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingRequestSMS } from '@/lib/sms'

// POST - Create a booking
export async function POST(request: NextRequest) {
    try {
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
            notes
        } = body

        // Validate required fields
        if (!locationId || !serviceId || !dateTime || !customerName || !customerEmail) {
            return NextResponse.json({
                error: 'Missing required fields: locationId, serviceId, dateTime, customerName, customerEmail'
            }, { status: 400 })
        }

        // Find or create client
        let client = await prisma.client.findFirst({
            where: {
                franchiseId,
                OR: [
                    { email: customerEmail },
                    ...(customerPhone ? [{ phone: customerPhone }] : [])
                ]
            }
        })

        if (!client) {
            // Parse name
            const nameParts = customerName.trim().split(' ')
            const firstName = nameParts[0]
            const lastName = nameParts.slice(1).join(' ') || ''

            client = await prisma.client.create({
                data: {
                    franchiseId,
                    firstName,
                    lastName,
                    email: customerEmail,
                    phone: customerPhone || null
                }
            })
        }

        // Get service for duration
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            select: { duration: true, name: true }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        // Get location with franchise for SMS
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        // Calculate end time
        const startTime = new Date(dateTime)
        const endTime = new Date(startTime.getTime() + service.duration * 60000)

        // Check for conflicts
        const conflict = await prisma.appointment.findFirst({
            where: {
                locationId,
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                // Overlapping time check
                OR: [
                    {
                        startTime: { lt: endTime },
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

        // Create appointment with PENDING status - staff must approve
        const appointment = await prisma.appointment.create({
            data: {
                clientId: client.id,
                employeeId: assignedStaffId,
                serviceId,
                locationId,
                startTime,
                endTime,
                status: 'PENDING_APPROVAL', // Requires staff confirmation
                notes: notes || null
            },
            include: {
                service: { select: { name: true, price: true } },
                employee: { select: { name: true } },
                location: { select: { name: true, address: true } }
            }
        })

        // Send SMS notification if customer has phone
        if (customerPhone && location) {
            await sendBookingRequestSMS(customerPhone, franchiseId, {
                customerName,
                businessName: location.franchise.name,
                serviceName: service.name,
                date: startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            })
        }

        return NextResponse.json({
            success: true,
            pendingApproval: true, // Flag for UI
            appointment: {
                id: appointment.id,
                service: appointment.service.name,
                staff: appointment.employee.name,
                location: appointment.location.name,
                address: appointment.location.address,
                date: startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                price: Number(appointment.service.price)
            }
        })
    } catch (error) {
        console.error('Error creating booking:', error)
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }
}

