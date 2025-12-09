import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get provider SMS configuration
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is provider
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can access this' }, { status: 403 })
        }

        // Get or create provider config
        let config = await prisma.providerSmsConfig.findFirst()

        if (!config) {
            config = await prisma.providerSmsConfig.create({
                data: {}
            })
        }

        // Mask sensitive data for response
        return NextResponse.json({
            ...config,
            twilioAuthToken: config.twilioAuthToken ? '••••••••' : null
        })
    } catch (error) {
        console.error('Error fetching SMS config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT - Update provider SMS configuration
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can update this' }, { status: 403 })
        }

        const body = await request.json()
        const {
            twilioEnabled,
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumber,
            smsCreditsIncluded,
            smsRatePerMessage
        } = body

        // Get existing config
        let config = await prisma.providerSmsConfig.findFirst()

        // Build update data
        const updateData: any = {
            twilioEnabled: twilioEnabled ?? false,
            twilioAccountSid: twilioAccountSid || null,
            twilioPhoneNumber: twilioPhoneNumber || null,
            smsCreditsIncluded: smsCreditsIncluded ?? 0,
            smsRatePerMessage: smsRatePerMessage ?? 0.01
        }

        // Only update token if not the masked value
        if (twilioAuthToken && twilioAuthToken !== '••••••••') {
            updateData.twilioAuthToken = twilioAuthToken
        }

        if (config) {
            config = await prisma.providerSmsConfig.update({
                where: { id: config.id },
                data: updateData
            })
        } else {
            config = await prisma.providerSmsConfig.create({
                data: updateData
            })
        }

        return NextResponse.json({
            success: true,
            config: {
                ...config,
                twilioAuthToken: config.twilioAuthToken ? '••••••••' : null
            }
        })
    } catch (error) {
        console.error('Error updating SMS config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}
