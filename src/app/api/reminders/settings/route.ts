import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptField, decryptField } from '@/lib/security'

// GET - Get reminder settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        let settings = await prisma.reminderSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.reminderSettings.create({
                data: { franchiseId: user.franchiseId }
            })
        }

        // Mask sensitive fields - never expose actual tokens
        return NextResponse.json({
            ...settings,
            twilioAccountSid: settings.twilioAccountSid ? '••••••••' : null,
            twilioAuthToken: settings.twilioAuthToken ? '••••••••' : null
        })
    } catch (error) {
        console.error('Error fetching reminder settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

// PUT - Update reminder settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { franchiseId: true, role: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        // Only owners/admins can change settings
        if (!['FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()

        // Don't update credentials if masked (user didn't change them)
        if (body.twilioAccountSid === '••••••••') {
            delete body.twilioAccountSid
        }
        if (body.twilioAuthToken === '••••••••') {
            delete body.twilioAuthToken
        }

        // Encrypt sensitive credentials before saving
        if (body.twilioAccountSid && body.twilioAccountSid !== '••••••••') {
            body.twilioAccountSid = encryptField(body.twilioAccountSid)
        }
        if (body.twilioAuthToken && body.twilioAuthToken !== '••••••••') {
            body.twilioAuthToken = encryptField(body.twilioAuthToken)
        }

        const settings = await prisma.reminderSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: body,
            create: { franchiseId: user.franchiseId, ...body }
        })

        return NextResponse.json({
            ...settings,
            twilioAccountSid: settings.twilioAccountSid ? '••••••••' : null,
            twilioAuthToken: settings.twilioAuthToken ? '••••••••' : null
        })
    } catch (error) {
        console.error('Error updating reminder settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}

/**
 * Helper function to get decrypted Twilio credentials for sending SMS
 * Use this in SMS sending code, NOT in the API responses
 */
export async function getTwilioCredentials(franchiseId: string): Promise<{
    accountSid: string | null
    authToken: string | null
    phoneNumber: string | null
} | null> {
    try {
        const settings = await prisma.reminderSettings.findUnique({
            where: { franchiseId },
            select: {
                twilioAccountSid: true,
                twilioAuthToken: true,
                twilioPhoneNumber: true
            }
        })

        if (!settings) return null

        return {
            accountSid: settings.twilioAccountSid ? decryptField(settings.twilioAccountSid) : null,
            authToken: settings.twilioAuthToken ? decryptField(settings.twilioAuthToken) : null,
            phoneNumber: settings.twilioPhoneNumber
        }
    } catch (error) {
        console.error('[Twilio] Error decrypting credentials:', error)
        return null
    }
}


