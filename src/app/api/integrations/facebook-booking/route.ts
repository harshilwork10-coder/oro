import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Webhook handler for Facebook Booking button
// Facebook will redirect users here when they click "Book Now" on your Facebook page

interface FacebookBookingPayload {
    // Facebook Lead/Booking data
    lead_id?: string
    page_id: string
    form_id?: string
    created_time: string
    field_data?: {
        name: string
        values: string[]
    }[]
    // Custom fields from booking form
    customer_name?: string
    customer_email?: string
    customer_phone?: string
    preferred_date?: string
    preferred_time?: string
    service?: string
    notes?: string
}

export async function POST(request: NextRequest) {
    try {
        const payload: FacebookBookingPayload = await request.json()

        console.log('[Facebook Booking] Received booking from page:', payload.page_id)

        // Extract customer info from field_data or direct fields
        let customerName = payload.customer_name || ''
        let customerEmail = payload.customer_email || ''
        let customerPhone = payload.customer_phone || ''
        let preferredDate = payload.preferred_date
        let preferredTime = payload.preferred_time

        // Parse Facebook's field_data format if present
        if (payload.field_data) {
            for (const field of payload.field_data) {
                if (field.name.toLowerCase().includes('name')) {
                    customerName = field.values[0]
                } else if (field.name.toLowerCase().includes('email')) {
                    customerEmail = field.values[0]
                } else if (field.name.toLowerCase().includes('phone')) {
                    customerPhone = field.values[0]
                } else if (field.name.toLowerCase().includes('date')) {
                    preferredDate = field.values[0]
                } else if (field.name.toLowerCase().includes('time')) {
                    preferredTime = field.values[0]
                }
            }
        }

        // Validate required fields
        if (!customerEmail && !customerPhone) {
            return NextResponse.json(
                { error: 'Customer email or phone is required' },
                { status: 400 }
            )
        }

        // Find or create client
        let client = await prisma.client.findFirst({
            where: {
                OR: [
                    { email: customerEmail || undefined },
                    { phone: customerPhone || undefined }
                ]
            }
        })

        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: customerName || 'Facebook Customer',
                    email: customerEmail || '',
                    phone: customerPhone || '',
                    source: 'FACEBOOK_BOOKING',
                }
            })
            console.log('[Facebook Booking] Created new client:', client.id)
        }

        // Parse date/time for appointment
        let startTime = new Date()
        let endTime = new Date()

        if (preferredDate && preferredTime) {
            try {
                startTime = new Date(`${preferredDate} ${preferredTime}`)
                endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour default
            } catch {
                // Keep default times if parsing fails
            }
        } else {
            // Default to next available slot (tomorrow 10am)
            startTime.setDate(startTime.getDate() + 1)
            startTime.setHours(10, 0, 0, 0)
            endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                clientId: client.id,
                startTime,
                endTime,
                status: 'PENDING', // Pending until confirmed by staff
                notes: `Facebook Booking\nLead ID: ${payload.lead_id || 'N/A'}\n${payload.notes || ''}`,
                source: 'FACEBOOK',
            }
        })

        console.log('[Facebook Booking] Created appointment:', appointment.id)

        return NextResponse.json({
            success: true,
            appointment_id: appointment.id,
            message: 'Booking request received. Our team will confirm shortly.'
        })

    } catch (error) {
        console.error('[Facebook Booking] Error processing booking:', error)
        return NextResponse.json(
            { error: 'Failed to process booking request' },
            { status: 500 }
        )
    }
}

// GET endpoint for webhook verification (Facebook requires this)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    // Facebook webhook verification
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // For Facebook verification, check the verify token
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'oronex_webhook_verify'

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[Facebook Booking] Webhook verified')
        return new NextResponse(challenge, { status: 200 })
    }

    // Normal status check
    return NextResponse.json({
        status: 'active',
        integration: 'Facebook Booking',
        message: 'Webhook endpoint is ready to receive bookings'
    })
}
