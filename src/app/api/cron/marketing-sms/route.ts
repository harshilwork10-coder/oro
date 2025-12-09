import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMissYouSMS, sendBirthdaySMS } from '@/lib/sms'

// This endpoint runs daily via cron to auto-send marketing SMS
// Based on owner-configured rules (Win-Back, Birthday, VIP, etc.)
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const results = {
            processed: 0,
            sent: 0,
            failed: 0,
            details: [] as string[]
        }

        // Get all active marketing rules with their franchises
        const rules = await prisma.smsMarketingRule.findMany({
            where: { isActive: true },
            include: {
                franchise: {
                    include: {
                        reminderSettings: true,
                        smsCredits: true
                    }
                }
            }
        })

        for (const rule of rules) {
            // Check if franchise has SMS approved and credits
            const settings = rule.franchise.reminderSettings
            const credits = rule.franchise.smsCredits

            if (!settings?.smsApproved || !settings?.smsEnabled) continue
            if (!credits || credits.creditsRemaining <= 0) continue

            // Process based on rule type
            if (rule.ruleType === 'WIN_BACK') {
                await processWinBackRule(rule, now, results)
            } else if (rule.ruleType === 'BIRTHDAY') {
                await processBirthdayRule(rule, now, results)
            }
        }

        return NextResponse.json({
            success: true,
            ...results
        })
    } catch (error) {
        console.error('Error processing marketing rules:', error)
        return NextResponse.json({ error: 'Failed to process marketing rules' }, { status: 500 })
    }
}

async function processWinBackRule(rule: any, now: Date, results: any) {
    const daysInactive = rule.daysInactive || 28
    const cutoffDate = new Date(now.getTime() - daysInactive * 24 * 60 * 60 * 1000)

    // Find clients in this franchise who haven't visited since cutoff
    const inactiveClients = await prisma.client.findMany({
        where: {
            franchiseId: rule.franchiseId,
            phone: { not: null },
            // Has transactions but last one is before cutoff
            transactions: {
                some: {},
                none: {
                    createdAt: { gte: cutoffDate }
                }
            }
        },
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            // Check if they already have an active promo from this rule
            customerPromos: {
                where: {
                    ruleType: 'WIN_BACK',
                    status: 'ACTIVE'
                }
            }
        }
    })

    for (const client of inactiveClients) {
        // Skip if already has active win-back promo
        if (client.customerPromos.length > 0) continue

        const lastVisit = client.transactions[0]?.createdAt
        if (!lastVisit) continue

        const daysSince = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

        results.processed++

        try {
            // Create promo for this client
            const expiresAt = new Date(now.getTime() + rule.validityDays * 24 * 60 * 60 * 1000)

            await prisma.customerPromo.create({
                data: {
                    franchiseId: rule.franchiseId,
                    clientId: client.id,
                    ruleType: 'WIN_BACK',
                    ruleName: `${rule.name}: ${rule.discountValue}% Off`,
                    discountType: rule.discountType,
                    discountValue: rule.discountValue,
                    expiresAt,
                    excludeFromLoyalty: true
                }
            })

            // Send SMS
            const smsResult = await sendMissYouSMS(
                client.phone!,
                rule.franchiseId,
                {
                    customerName: `${client.firstName} ${client.lastName}`,
                    businessName: rule.franchise.name,
                    lastVisitDays: daysSince,
                    offerDetails: `${Number(rule.discountValue)}% off your next visit! Valid for ${rule.validityDays} days.`
                }
            )

            if (smsResult.success) {
                // Update rule stats
                await prisma.smsMarketingRule.update({
                    where: { id: rule.id },
                    data: { sentCount: { increment: 1 } }
                })
                results.sent++
                results.details.push(`Win-back SMS sent to ${client.firstName} (${daysSince} days inactive)`)
            } else {
                results.failed++
                results.details.push(`Failed: ${client.firstName} - ${smsResult.error}`)
            }
        } catch (error) {
            results.failed++
            results.details.push(`Error: ${client.firstName}`)
        }
    }
}

async function processBirthdayRule(rule: any, now: Date, results: any) {
    // Get clients with birthdays in next 3 days
    // This would require a birthday field on Client model
    // For now, log that birthday rule was checked
    results.details.push('Birthday rule checked (requires birthday field on Client)')
}
