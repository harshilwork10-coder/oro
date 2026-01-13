import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { franchisorId, carrier, trackingNumber, notes } = body

        if (!franchisorId || !carrier || !trackingNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Lookup the Franchise ID for this Franchisor
        // @ts-ignore
        const franchise = await prisma.franchise.findFirst({
            where: { franchisorId: franchisorId },
            include: { locations: true }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found for this client' }, { status: 404 })
        }

        const location = franchise.locations?.[0] as any

        // Create the shipment linked to the Franchise
        // @ts-ignore
        const newShipment = await prisma.shipment.create({
            data: {
                franchiseId: franchise.id,
                carrier,
                trackingNumber,
                notes,
                status: 3, // SHIPPED
                createdByUserId: session.user.id,
                // Required shipping fields - use location address or placeholders
                shipToName: franchise.name,
                shipToAddress1: location?.address || 'Address Pending',
                shipToCity: 'See Address',
                shipToState: 'N/A',
                shipToPostalCode: '00000',
                shipToCountry: 'USA'
            }
        })

        // Update OnboardingRequest status
        try {
            // @ts-ignore
            await prisma.onboardingRequest.updateMany({
                where: { franchisorId: franchisorId },
                data: { status: 5 } // 5 = SHIPPED
            })
        } catch (updateError) {
            console.error('Failed to update OnboardingRequest status:', updateError)
        }


        return NextResponse.json({ success: true, message: 'Shipment created successfully' })
    } catch (error) {
        console.error('Error creating shipment:', error)
        return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
    }
}
