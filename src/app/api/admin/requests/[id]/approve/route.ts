import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { generateLicenseKey } from '@/lib/licenseUtils'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
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

        if (licenseRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
        }

        // 1. Generate Licenses (Pending Activation)
        const licenses: string[] = []
        for (let i = 0; i < licenseRequest.numberOfStations; i++) {
            const key = generateLicenseKey()
            await prisma.license.create({
                data: {
                    key,
                    franchisorId: licenseRequest.franchisorId,
                    locationId: licenseRequest.locationId,
                    status: 'PENDING',
                    type: 'POS_STATION',
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            })
            licenses.push(key)
        }

        // 2. Update Request Status
        await prisma.licenseRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedBy: session.user.id,
                approvedAt: new Date()
            }
        })

        // 3. Send Email to Franchisor
        const contractUrl = `${process.env.NEXTAUTH_URL}/dashboard/requests/${requestId}/contract`

        await sendEmail({
            to: licenseRequest.franchisor.owner?.email!,
            subject: 'License Request Approved - Action Required',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Request Approved!</h1>
                    <p>Your request for <strong>${licenseRequest.numberOfStations} stations</strong> at <strong>${licenseRequest.location?.name}</strong> has been approved.</p>
                    <p>Please review and sign the license agreement to receive your activation codes and initiate hardware shipping.</p>
                    <br/>
                    <a href="${contractUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review & Sign Contract</a>
                </div>
            `
        })

        return NextResponse.json({
            success: true,
            message: 'Request approved and contract sent'
        })

    } catch (error) {
        console.error('Error approving request:', error)
        return NextResponse.json(
            { error: 'Failed to approve request' },
            { status: 500 }
        )
    }
}
