/**
 * Campaign Preview API
 * 
 * GET: Preview audience, suppression, and quota impact before sending
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    generateCampaignPreview,
    generateTemplateHash,
    SmsRecipient
} from '@/lib/sms/compliance'

// GET - Preview campaign before sending
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, audienceType, messageTemplate, dealSuggestionId } = body

        if (!locationId || !audienceType || !messageTemplate) {
            return NextResponse.json(
                { error: 'Missing required fields: locationId, audienceType, messageTemplate' },
                { status: 400 }
            )
        }

        // Get location info for business name
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
                franchise: {
                    include: { franchisor: true }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        const businessName = location.franchise?.franchisor?.name || location.name

        // Build audience based on type
        const recipients = await buildAudience(locationId, audienceType)

        // Generate preview with all validations
        const preview = await generateCampaignPreview(
            locationId,
            recipients,
            messageTemplate,
            audienceType,
            businessName
        )

        // Add template hash for duplicate check reference
        const templateHash = generateTemplateHash(messageTemplate, audienceType)

        return NextResponse.json({
            success: true,
            preview: {
                ...preview,
                templateHash,
                businessName
            }
        })

    } catch (error) {
        console.error('[CAMPAIGN_PREVIEW]', error)
        return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
    }
}

// Build audience based on type
async function buildAudience(locationId: string, audienceType: string): Promise<SmsRecipient[]> {
    const now = new Date()
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get location's franchise to find clients
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { franchiseId: true }
    })

    if (!location) return []

    let whereClause: any = {
        franchiseId: location.franchiseId,
        phone: { not: null }
    }

    // Filter based on audience type
    switch (audienceType) {
        case 'INACTIVE_35':
            // Customers inactive 35+ days
            whereClause.lastVisit = { lt: thirtyFiveDaysAgo }
            break
        case 'NEW_14':
            // New customers in last 14 days
            whereClause.createdAt = { gte: fourteenDaysAgo }
            break
        case 'VIP':
            // Top spenders (top 20%)
            whereClause.lifetimeValue = { gte: 500 } // Example threshold
            break
        case 'REBOOK':
            // Visited in last 7 days (for rebook incentive)
            whereClause.lastVisit = { gte: sevenDaysAgo }
            break
        case 'ALL':
        case 'CUSTOM':
        default:
            // All active customers with phone
            break
    }

    const clients = await prisma.client.findMany({
        where: whereClause,
        select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            lastVisit: true,
            marketingConsent: true,
            consentTimestamp: true
        },
        take: 5000 // Safety limit
    })

    // Get opted out phones
    const optOuts = await prisma.smsOptOut.findMany({
        select: { phone: true }
    })
    const optOutSet = new Set(optOuts.map(o => o.phone))

    // Get recent sends for frequency check
    const recentSends = await prisma.smsUsageLedger.findMany({
        where: {
            locationId,
            messageType: 'PROMO',
            status: { in: ['SENT', 'DELIVERED'] },
            sentAt: { gte: sevenDaysAgo }
        },
        select: { phone: true }
    })
    const recentSendSet = new Set(recentSends.map(s => s.phone))

    // Get delivery failures
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const failures = await prisma.smsUsageLedger.groupBy({
        by: ['phone'],
        where: {
            locationId,
            status: 'FAILED',
            createdAt: { gte: thirtyDaysAgo }
        },
        _count: { id: true }
    })
    const failureMap = new Map(failures.map(f => [f.phone, f._count.id]))

    return clients.map(client => ({
        customerId: client.id,
        phone: client.phone!,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        lastVisit: client.lastVisit || undefined,
        lastPromoReceived: recentSendSet.has(client.phone!) ? new Date() : undefined,
        hasConsent: client.marketingConsent || false,
        consentTimestamp: client.consentTimestamp || undefined,
        isOptedOut: optOutSet.has(client.phone!),
        deliveryFailures: failureMap.get(client.phone!) || 0,
        hasRedeemedCampaign: false // Would need to check CustomerPromo table
    }))
}
