import { NextRequest, NextResponse } from 'next/server'

// Webhook handler for Reserve with Google bookings
// Google will send booking data to this endpoint when customers book via Google Search/Maps
//
// NOTE: This is a STUB implementation. Full integration requires:
// 1. Google Business Profile API setup
// 2. Proper merchant_id to franchise/location mapping
// 3. Service ID mapping to your service catalog

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
        console.log('[Google Booking] Merchant:', payload.merchant_id)
        console.log('[Google Booking] Customer:', payload.user_information.name)

        // Validate required fields
        if (!payload.booking_id || !payload.slot || !payload.user_information) {
            return NextResponse.json(
                { error: 'Missing required booking fields' },
                { status: 400 }
            )
        }

        // Log the booking request for manual processing
        console.log('[Google Booking] Booking details:', {
            booking_id: payload.booking_id,
            merchant_id: payload.merchant_id,
            customer: payload.user_information,
            slot: payload.slot,
            service: payload.service_name || payload.service_id,
            notes: payload.notes
        })

        // TODO: Implement full integration:
        // 1. Map merchant_id to franchise/location
        // 2. Create or find client with proper franchiseId
        // 3. Map service_id to actual Service in database
        // 4. Create appointment with all required fields (locationId, serviceId, employeeId)
        // 5. Send confirmation to customer

        // Return success response in Google's expected format
        return NextResponse.json({
            status: 'SUCCESS',
            booking_id: payload.booking_id,
            message: 'Booking request received. Confirmation will be sent shortly.'
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
