/**
 * Marketing Campaigns API
 * GET  /api/pos/marketing/campaigns
 * POST /api/pos/marketing/campaigns
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const rules = await prisma.smsMarketingRule.findMany({
            where: { franchiseId },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
        const campaigns = rules.map(r => ({
            id: r.id,
            name: r.name || r.ruleType || 'Campaign',
            type: 'SMS',
            status: r.isActive ? 'ACTIVE' : 'DRAFT',
            recipientCount: 0,
            sentCount: r.sentCount || 0,
            openRate: 0,
            scheduledDate: null
        }))
        return NextResponse.json({ success: true, data: campaigns })
    } catch (error) {
        console.error('[MARKETING_CAMPAIGNS_GET]', error)
        return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
    }
})

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const body = await req.json()
        await prisma.smsMarketingRule.create({
            data: {
                franchiseId,
                name: body.name,
                ruleType: 'MANUAL',
                messageTemplate: body.message || '',
                isActive: false
            }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[MARKETING_CAMPAIGNS_POST]', error)
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }
})
