import { NextRequest, NextResponse } from 'next/server'

// Webhook handler for Facebook Booking button
// Facebook will redirect users here when they click "Book Now" on your Facebook page
// 
// NOTE: This is a STUB implementation. Full integration requires:
// 1. Facebook App configuration with valid Page ID
// 2. Proper franchise/location mapping based on page_id
// 3. Service selection from booking form

interface FacebookBookingPayload {
    lead_id?: string
    page_id: string
    form_id?: string
    created_time: string
    field_data?: {
        name: string
        values: string[]
    }[]
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

        console.log('[Facebook Booking] Received booking request from page:', payload.page_id)
        console.log('[Facebook Booking] Lead ID:', payload.lead_id)
        console.log('[Facebook Booking] Customer:', payload.customer_name || payload.customer_email)

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

        // Log the booking request for manual processing
        console.log('[Facebook Booking] Parsed booking request:', {
            customerName,
            customerEmail,
            customerPhone,
            preferredDate,
            preferredTime,
            service: payload.service,
            notes: payload.notes
        })

        // TODO: Implement full integration:
        // 1. Map page_id to franchise/location
        // 2. Create or find client with proper franchiseId
        // 3. Create appointment with required fields (locationId, serviceId, employeeId)
        // 4. Send confirmation email/SMS to customer

        return NextResponse.json({
            success: true,
            message: 'Booking request received. Our team will contact you shortly to confirm.',
            lead_id: payload.lead_id
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
