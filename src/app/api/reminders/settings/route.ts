import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

        // Mask sensitive fields
        return NextResponse.json({
            ...settings,
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

        // Don't update token if masked
        if (body.twilioAuthToken === '••••••••') {
            delete body.twilioAuthToken
        }

        const settings = await prisma.reminderSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: body,
            create: { franchiseId: user.franchiseId, ...body }
        })

        return NextResponse.json({
            ...settings,
            twilioAuthToken: settings.twilioAuthToken ? '••••••••' : null
        })
    } catch (error) {
        console.error('Error updating reminder settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
