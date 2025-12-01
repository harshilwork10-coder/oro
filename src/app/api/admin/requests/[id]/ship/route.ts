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

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { trackingNumber, carrier, estimatedDelivery } = body

        if (!trackingNumber || !carrier) {
            return NextResponse.json(
                { error: 'Tracking number and carrier are required' },
                { status: 400 }
            )
        }

        // Fetch the request
        const licenseRequest = await prisma.licenseRequest.findUnique({
            where: { id: params.id },
            include: {
                franchisor: { include: { owner: true } },
                location: true
            }
        })

        if (!licenseRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Update shipping info
        await prisma.licenseRequest.update({
            where: { id: params.id },
            data: {
                shippingStatus: 'SHIPPED',
                trackingNumber,
                carrier,
                shippedAt: new Date(),
                estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null
            }
        })

        // Send notification email
        await sendEmail({
            to: licenseRequest.franchisor.owner?.email!,
            subject: 'Your Order Has Shipped! 🚚',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Your Order is On Its Way!</h1>
                    <p>Great news! Your hardware order for <strong>${licenseRequest.location?.name}</strong> has shipped.</p>
                    <br/>
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                        <p style="margin: 0; color: #666; font-size: 14px;">Tracking Number</p>
                        <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 18px; font-weight: bold;">${trackingNumber}</p>
                        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Carrier: ${carrier}</p>
                        ${estimatedDelivery ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Est. Delivery: ${new Date(estimatedDelivery).toLocaleDateString()}</p>` : ''}
                    </div>
                    <br/>
                    <p>Track your order in the <strong>My Orders</strong> section of your dashboard.</p>
                </div>
            `
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating shipping:', error)
        return NextResponse.json(
            { error: 'Failed to update shipping status' },
            { status: 500 }
        )
    }
}
