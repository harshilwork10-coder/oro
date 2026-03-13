import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOwnerContext } from '@/lib/owner-intelligence'

/**
 * Owner Notification Preferences API
 * 
 * GET  — Fetch current preferences
 * PUT  — Update preferences
 */
export async function GET() {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let prefs = await prisma.ownerNotificationPreference.findUnique({
            where: { userId_franchiseId: { userId: ctx.userId, franchiseId: ctx.franchiseId } },
        })

        // Return defaults if not yet configured
        if (!prefs) {
            prefs = {
                id: '',
                userId: ctx.userId,
                franchiseId: ctx.franchiseId,
                morningEmailEnabled: true,
                morningEmailTime: '06:30',
                dailyRecapEnabled: true,
                weeklyDigestEnabled: true,
                criticalSmsEnabled: true,
                depositSmsEnabled: true,
                complianceSmsEnabled: true,
                cashVarianceSmsEnabled: false,
                quietHoursStart: '22:00',
                quietHoursEnd: '06:00',
                weekendEnabled: true,
                weightOverrides: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        }

        return NextResponse.json(prefs)
    } catch (error) {
        console.error('[OWNER_PREFS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const ctx = await getOwnerContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()

        // Only allow known fields
        const allowed = [
            'morningEmailEnabled', 'morningEmailTime',
            'dailyRecapEnabled', 'weeklyDigestEnabled',
            'criticalSmsEnabled', 'depositSmsEnabled',
            'complianceSmsEnabled', 'cashVarianceSmsEnabled',
            'quietHoursStart', 'quietHoursEnd', 'weekendEnabled',
            'weightOverrides',
        ]
        const data: any = {}
        for (const key of allowed) {
            if (body[key] !== undefined) data[key] = body[key]
        }

        const prefs = await prisma.ownerNotificationPreference.upsert({
            where: { userId_franchiseId: { userId: ctx.userId, franchiseId: ctx.franchiseId } },
            update: data,
            create: { userId: ctx.userId, franchiseId: ctx.franchiseId, ...data },
        })

        return NextResponse.json(prefs)
    } catch (error) {
        console.error('[OWNER_PREFS_PUT]', error)
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }
}
