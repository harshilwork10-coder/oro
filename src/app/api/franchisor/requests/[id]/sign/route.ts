import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const requestId = params.id

        // Fetch the request
        const licenseRequest = await prisma.licenseRequest.findUnique({
            where: { id: requestId },
            include: {
                franchisor: { include: { owner: true } },
                location: true
            }
        })

        if (!licenseRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Verify ownership
        if (licenseRequest.franchisor.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (licenseRequest.status !== 'APPROVED') {
            return NextResponse.json({ error: 'Request is not in approved state' }, { status: 400 })
        }

        if (licenseRequest.contractSignedAt) {
            return NextResponse.json({ error: 'Contract already signed' }, { status: 400 })
        }

        // 1. Mark Contract as Signed
        await prisma.licenseRequest.update({
            where: { id: requestId },
            data: {
                contractSignedAt: new Date(),
                // We could also update status to 'COMPLETED' or 'FULFILLING'
            }
        })

        // 2. Activate Licenses
        // Find licenses associated with this request (via location/franchisor)
        // Since we didn't link licenses directly to the request in the schema (only via location/franchisor),
        // we need to find pending licenses for this location that were created recently or match the count.
        // Ideally, we should have linked licenses to the request, but for now, we can find PENDING licenses for this location.

        await prisma.license.updateMany({
            where: {
                locationId: licenseRequest.locationId,
                franchisorId: licenseRequest.franchisorId,
                status: 'PENDING'
            },
            data: {
                status: 'ACTIVE'
            }
        })

        // 3. Notify Shipping Department (Mock)
        // In a real app, this would push to a queue or email the warehouse
        await sendEmail({
            to: 'shipping@aura-pos.com', // Internal shipping email
            subject: `SHIPMENT ORDER: ${licenseRequest.franchisor.name} - ${licenseRequest.location?.name}`,
            html: `
                <h1>New Hardware Shipment Order</h1>
                <p><strong>Customer:</strong> ${licenseRequest.franchisor.name}</p>
                <p><strong>Location:</strong> ${licenseRequest.location?.name}</p>
                <p><strong>Stations:</strong> ${licenseRequest.numberOfStations}</p>
                <p><strong>Status:</strong> Contract Signed & Licenses Activated</p>
                <br/>
                <p>Please prepare and ship hardware immediately.</p>
            `
        })

        // 4. Notify User
        await sendEmail({
            to: licenseRequest.franchisor.owner?.email!,
            subject: 'You are ready to go! 🚀',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to the Family!</h1>
                    <p>We've received your signed contract.</p>
                    <p><strong>1. Licenses Activated:</strong> Your license keys are now active in your dashboard.</p>
                    <p><strong>2. Hardware Shipping:</strong> Your hardware order has been sent to our warehouse and will ship within 24 hours.</p>
                    <br/>
                    <p>Get ready to sell!</p>
                </div>
            `
        })

        return NextResponse.json({
            success: true,
            message: 'Contract accepted and fulfillment started'
        })

    } catch (error) {
        console.error('Error accepting contract:', error)
        return NextResponse.json(
            { error: 'Failed to accept contract' },
            { status: 500 }
        )
    }
}
