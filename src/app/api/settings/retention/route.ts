import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/settings/retention — Load retention suite config
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId },
            select: { retentionConfig: true }
        })

        if (!settings?.retentionConfig) {
            return NextResponse.json({ config: null })
        }

        return NextResponse.json({ config: JSON.parse(settings.retentionConfig) })
    } catch (error) {
        console.error('[RETENTION_SETTINGS] GET error:', error)
        return NextResponse.json({ error: 'Failed to load retention settings' }, { status: 500 })
    }
}

// PUT /api/settings/retention — Persist retention suite config
export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'PROVIDER'].includes(user.role)) {
        return NextResponse.json({ error: 'Only the owner can change retention settings' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const configJson = JSON.stringify(body)

        await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: { retentionConfig: configJson },
            create: {
                franchiseId: user.franchiseId,
                retentionConfig: configJson
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[RETENTION_SETTINGS] PUT error:', error)
        return NextResponse.json({ error: 'Failed to save retention settings' }, { status: 500 })
    }
}
