import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get feature toggle settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) {
            // Return defaults
            return NextResponse.json({
                // Booking Features
                enableOnlineBooking: true,
                enableAddOnServices: true,
                enableGroupBooking: false,
                enableWaitlist: true,
                enableWaitlistAutoFill: false,
                // Payment & Protection
                enablePrepayment: false,
                prepaymentType: 'FULL',
                prepaymentAmount: 0,
                enableNoShowCharge: false,
                noShowFeeType: 'FLAT',
                noShowFeeAmount: 25,
                // Communication
                enableSmsReminders: false,
                enableReviewBooster: false,
                enableMarketingCampaigns: false,
                // Staff & Payroll
                enableAutoPayroll: false,
                enableRentCollection: false,
                // AI Features
                enableSmartRebooking: false,
                // Visibility
                enableBarberProfiles: true,
                enableIndividualLinks: true
            })
        }

        return NextResponse.json({
            enableOnlineBooking: settings.enableOnlineBooking,
            enableAddOnServices: settings.enableAddOnServices,
            enableGroupBooking: settings.enableGroupBooking,
            enableWaitlist: settings.enableWaitlist,
            enableWaitlistAutoFill: settings.enableWaitlistAutoFill,
            enablePrepayment: settings.enablePrepayment,
            prepaymentType: settings.prepaymentType,
            prepaymentAmount: Number(settings.prepaymentAmount),
            enableNoShowCharge: settings.enableNoShowCharge,
            noShowFeeType: settings.noShowFeeType,
            noShowFeeAmount: Number(settings.noShowFeeAmount),
            enableSmsReminders: settings.enableSmsReminders,
            enableReviewBooster: settings.enableReviewBooster,
            enableMarketingCampaigns: settings.enableMarketingCampaigns,
            enableAutoPayroll: settings.enableAutoPayroll,
            enableRentCollection: settings.enableRentCollection,
            enableSmartRebooking: settings.enableSmartRebooking,
            enableBarberProfiles: settings.enableBarberProfiles,
            enableIndividualLinks: settings.enableIndividualLinks
        })
    } catch (error) {
        console.error('Error fetching feature settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

// PUT - Update feature toggle settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only owners/managers can change feature settings
        if (!['OWNER', 'MANAGER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const body = await request.json()

        // Build update object with only allowed fields
        const updateData: any = {}
        const allowedFields = [
            'enableOnlineBooking', 'enableAddOnServices', 'enableGroupBooking',
            'enableWaitlist', 'enableWaitlistAutoFill', 'enablePrepayment',
            'prepaymentType', 'prepaymentAmount', 'enableNoShowCharge',
            'noShowFeeType', 'noShowFeeAmount', 'enableSmsReminders',
            'enableReviewBooster', 'enableMarketingCampaigns', 'enableAutoPayroll',
            'enableRentCollection', 'enableSmartRebooking', 'enableBarberProfiles',
            'enableIndividualLinks'
        ]

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: updateData,
            create: {
                franchiseId: user.franchiseId,
                ...updateData
            }
        })

        return NextResponse.json({ success: true, settings })
    } catch (error) {
        console.error('Error updating feature settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
