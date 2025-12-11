import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Webhook handler for Reserve with Google bookings
// Google will send booking data to this endpoint when customers book via Google Search/Maps

interface GoogleBookingPayload {
    booking_id: string
    merchant_id: string
    slot: {
        start_time: string
        end_time: string
        duration_minutes: number
    }
    user_information: {
        name: string
        email: string
        phone?: string
    }
    service_id?: string
    service_name?: string
    notes?: string
}

export async function POST(request: NextRequest) {
    try {
        const payload: GoogleBookingPayload = await request.json()

        console.log('[Google Booking] Received booking:', payload.booking_id)

        // Validate required fields
        if (!payload.booking_id || !payload.slot || !payload.user_information) {
            return NextResponse.json(
                { error: 'Missing required booking fields' },
                { status: 400 }
            )
        }

        // Find or create client
        let client = await prisma.client.findFirst({
            where: { email: payload.user_information.email }
        })

        if (!client) {
            // Create new client from booking
            client = await prisma.client.create({
                data: {
                    name: payload.user_information.name,
                    email: payload.user_information.email,
                    phone: payload.user_information.phone || '',
                    source: 'GOOGLE_BOOKING',
                    // TODO: Associate with correct franchise based on merchant_id
                }
            })
            console.log('[Google Booking] Created new client:', client.id)
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                clientId: client.id,
                startTime: new Date(payload.slot.start_time),
                endTime: new Date(payload.slot.end_time),
                status: 'CONFIRMED',
                notes: `Google Booking ID: ${payload.booking_id}\n${payload.notes || ''}`,
                source: 'GOOGLE',
                // TODO: Map service_id to actual service
                // TODO: Associate with correct location/employee
            }
        })

        console.log('[Google Booking] Created appointment:', appointment.id)

        // Return success response in Google's expected format
        return NextResponse.json({
            status: 'SUCCESS',
            booking_id: payload.booking_id,
            appointment_id: appointment.id,
            message: 'Booking confirmed'
        })

    } catch (error) {
        console.error('[Google Booking] Error processing booking:', error)
        return NextResponse.json(
            { error: 'Failed to process booking', status: 'ERROR' },
            { status: 500 }
        )
    }
}

// GET endpoint to verify webhook is active
export async function GET() {
    return NextResponse.json({
        status: 'active',
        integration: 'Reserve with Google',
        message: 'Webhook endpoint is ready to receive bookings'
    })
}
