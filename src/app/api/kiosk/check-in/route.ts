import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/security'

export async function POST(request: Request) {
    try {
        // Rate limit by IP - max 30 check-ins per minute per IP to prevent abuse
        const rateLimitResponse = await applyRateLimit(
            '/api/kiosk/check-in',
            { maxAttempts: 18, windowMs: 60000 }
        )
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { name, email, phone, liabilitySigned, loyaltyJoined, locationId } = body

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
        }

        const [firstName, ...lastNameParts] = name.split(' ')
        const lastName = lastNameParts.join(' ') || ''

        // Get the location's franchiseId
        let franchiseId: string | null = null
        let resolvedLocationId: string | null = locationId || null

        if (locationId) {
            const location = await prisma.location.findUnique({
                where: { id: locationId },
                select: { franchiseId: true }
            })
            franchiseId = location?.franchiseId || null
        }

        // If no locationId provided, get the first location (for testing)
        if (!franchiseId) {
            const firstLocation = await prisma.location.findFirst({
                select: { franchiseId: true, id: true }
            })
            franchiseId = firstLocation?.franchiseId || null
            resolvedLocationId = firstLocation?.id || null
        }

        if (!franchiseId) {
            return NextResponse.json({ error: 'No location or franchise found' }, { status: 404 })
        }

        // Check if customer already exists by phone number
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

        // Create Check-In Record
        if (resolvedLocationId) {
            await (prisma as any).checkIn.create({
                data: {
                    clientId: customer.id,
                    locationId: resolvedLocationId,
                    status: 'WAITING'
                }
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

