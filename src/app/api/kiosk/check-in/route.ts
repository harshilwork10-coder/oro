import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/security'
import { cacheDelete, CACHE_KEYS } from '@/lib/cache'

export async function POST(request: Request) {
    try {
        // Rate limit by IP - max 30 check-ins per minute per IP to prevent abuse
        const rateLimitResponse = await applyRateLimit(
            '/api/kiosk/check-in',
            { maxAttempts: 30, windowMs: 60000 }
        )
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { name, email, phone, liabilitySigned, loyaltyJoined, locationId } = body

        // QR Check-In extension — all optional, existing callers unaffected
        const source = body.source || 'KIOSK'
        const appointmentId = body.appointmentId || null
        const stationRef = body.stationRef || null

        // Multi-tenant QR enrichment (Phase 1)
        const brandId = body.brandId || null
        const deviceId = body.deviceId || null
        const qrTokenId = body.qrTokenId || null

        if (!name || !phone || !email || email.trim() === '') {
            return NextResponse.json({ error: 'Name, phone, and email are required' }, { status: 400 })
        }

        // ═══ LOCATION SAFETY: Require locationId — never guess ═══
        // The old code fell back to prisma.location.findFirst() which could
        // assign a check-in to a random location in a multi-franchise system.
        // Now we require locationId from the device (set during station pairing).
        if (!locationId) {
            return NextResponse.json(
                { error: 'locationId is required. Device must be paired to a location.' },
                { status: 400 }
            )
        }

        const [firstName, ...lastNameParts] = name.split(' ')
        const lastName = lastNameParts.join(' ') || ''

        // Resolve location → franchiseId (validates locationId exists)
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location?.franchiseId) {
            return NextResponse.json(
                { error: 'Invalid locationId — location not found' },
                { status: 404 }
            )
        }

        const franchiseId = location.franchiseId

        // Check if customer already exists by phone number (within this franchise)
        const existingCustomer = await prisma.client.findFirst({
            where: {
                phone: phone,
                franchiseId: franchiseId
            }
        })

        let customer

        if (existingCustomer) {
            // Update existing customer
            customer = await prisma.client.update({
                where: { id: existingCustomer.id },
                data: {
                    firstName,
                    lastName,
                    email: email || existingCustomer.email,
                    liabilitySigned: liabilitySigned === true ? true : existingCustomer.liabilitySigned,
                    loyaltyJoined: loyaltyJoined === true ? true : existingCustomer.loyaltyJoined,
                }
            })
        } else {
            // Create new customer
            customer = await prisma.client.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    liabilitySigned: liabilitySigned || false,
                    loyaltyJoined: loyaltyJoined || false,
                    franchiseId: franchiseId
                }
            })
        }

        // ═══ DUPLICATE PREVENTION: Same client + location + today ═══
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const existingCheckIn = await prisma.checkIn.findFirst({
            where: {
                clientId: customer.id,
                locationId: locationId,
                checkedInAt: { gte: today, lt: tomorrow },
                status: { in: ['WAITING', 'IN_SERVICE', 'SERVED'] }
            }
        })

        if (existingCheckIn) {
            // Idempotent response — same shape as success, no duplicate row
            return NextResponse.json({
                ...customer,
                name: `${customer.firstName} ${customer.lastName}`,
                alreadyCheckedIn: true,
                checkInId: existingCheckIn.id
            })
        }

        // Create Check-In Record
        await prisma.checkIn.create({
            data: {
                clientId: customer.id,
                locationId: locationId,
                status: 'WAITING',
                source,
                appointmentId,
                stationRef,
                brandId,
                deviceId,
                qrTokenId,
            }
        })

        // Invalidate queue cache so cashier devices see new check-in immediately
        cacheDelete(CACHE_KEYS.QUEUE(locationId)).catch(() => {})

        // If checking in against an appointment, mark it as CHECKED_IN
        if (appointmentId) {
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: { status: 'CHECKED_IN' }
            }).catch(() => {
                // Silent fail — check-in record already created successfully
                // Appointment status update is non-critical enhancement
            })
        }

        return NextResponse.json({
            ...customer,
            name: `${customer.firstName} ${customer.lastName}`
        })
    } catch (error) {
        console.error('Error in kiosk check-in:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
