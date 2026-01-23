/**
 * Schedule Deal API
 * 
 * POST: Schedule a deal suggestion as a campaign
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    generateTemplateHash,
    checkDuplicateCampaign,
    validateMessageFooter
} from '@/lib/sms/compliance'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            dealSuggestionId,
            locationId,
            messageTemplate,
            audienceType,
            scheduledFor,
            targetDays,
            targetTimeStart,
            targetTimeEnd
        } = body

        if (!locationId || !messageTemplate || !scheduledFor) {
            return NextResponse.json(
                { error: 'Missing required fields: locationId, messageTemplate, scheduledFor' },
                { status: 400 }
            )
        }

        // Get business name for footer validation
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

        // Validate footer
        const footerCheck = validateMessageFooter(messageTemplate, businessName)
        if (!footerCheck.valid) {
            return NextResponse.json({
                error: `Invalid message: ${footerCheck.reason}`,
                reason: footerCheck.reason
            }, { status: 400 })
        }

        // Check for duplicates
        const templateHash = generateTemplateHash(messageTemplate, audienceType || 'CUSTOM')
        const dupCheck = await checkDuplicateCampaign(locationId, templateHash)

        if (dupCheck.isDuplicate) {
            return NextResponse.json({
                error: 'Duplicate campaign',
                reason: 'DUPLICATE_WITHIN_7_DAYS',
                blockedUntil: dupCheck.blockedUntil
            }, { status: 400 })
        }

        // Create campaign
        const campaign = await prisma.dealCampaign.create({
            data: {
                locationId,
                dealSuggestionId: dealSuggestionId || null,
                templateHash,
                audienceType: audienceType || 'CUSTOM',
                messageTemplate,
                scheduledFor: new Date(scheduledFor),
                status: 'SCHEDULED',
                createdById: session.user.id
            }
        })

        // Update deal suggestion status if linked
        if (dealSuggestionId) {
            await prisma.dealSuggestion.update({
                where: { id: dealSuggestionId },
                data: {
                    status: 'SCHEDULED',
                    scheduledFor: new Date(scheduledFor),
                    targetDays: targetDays || [],
                    targetTimeStart,
                    targetTimeEnd
                }
            })
        }

        return NextResponse.json({
            success: true,
            campaign
        })

    } catch (error) {
        console.error('[DEAL_SCHEDULE]', error)
        return NextResponse.json({ error: 'Failed to schedule deal' }, { status: 500 })
    }
}
