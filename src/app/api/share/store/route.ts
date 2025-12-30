import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

// POST - Send store link via SMS using existing Twilio infrastructure
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, locationId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        const body = await request.json()
        const { phone, customerName } = body

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
        }

        // Get store info for personalized message
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: {
                name: true,
                settings: {
                    select: {
                        storeDisplayName: true
                    }
                }
            }
        })

        const storeName = franchise?.settings?.storeDisplayName || franchise?.name || 'our store'

        // Build the message
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yoursite.com'
        const greeting = customerName ? `Hi ${customerName.split(' ')[0]}! ` : ''

        const message = `${greeting}Check out ${storeName} on Oro Buddy! 🏷️

Get exclusive deals and discounts on your phone:
${appUrl}/app

See you soon! 😊`

        // Use existing sendSMS - it handles credits, logging, and Twilio
        const result = await sendSMS(phone, message, user.franchiseId)

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Store link sent successfully!',
                messageId: result.messageId
            })
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to send SMS'
            }, { status: 400 })
        }
    } catch (error) {
        console.error('Share store SMS error:', error)
        return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
    }
}

