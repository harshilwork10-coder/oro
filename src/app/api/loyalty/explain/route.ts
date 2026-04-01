import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/loyalty/explain?transactionId=xxx
 *
 * Rule explainability for a past transaction:
 * - Shows matched rule per item
 * - Shows excluded reason
 * - Shows campaign/bonus effect if any
 * - Shows eligible vs excluded totals
 *
 * POST /api/loyalty/explain
 * 
 * Simulate a cart against current rules WITHOUT awarding points.
 * Body: { items: [{ name, category, upc, price, quantity, isTobacco }] }
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const transactionId = searchParams.get('transactionId')

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId required' }, { status: 400 })
        }

        // Find the loyalty points transaction for this sale
        const pointsTx = await prisma.pointsTransaction.findFirst({
            where: { transactionId, type: 'EARN' },
            include: {
                member: {
                    select: {
                        id: true,
                        phone: true,
                        name: true,
                        pointsBalance: true
                    }
                },
                program: {
                    select: {
                        id: true,
                        name: true,
                        pointsPerDollar: true,
                        useSmartRewards: true
                    }
                }
            }
        })

        if (!pointsTx) {
            // Check if there's a REDEEM for this transaction instead
            const redeemTx = await prisma.pointsTransaction.findFirst({
                where: { transactionId, type: 'REDEEM' },
                include: {
                    member: { select: { id: true, phone: true, name: true, pointsBalance: true } }
                }
            })

            if (redeemTx) {
                return NextResponse.json({
                    transactionId,
                    type: 'REDEEM',
                    points: redeemTx.points,
                    description: redeemTx.description,
                    member: redeemTx.member,
                    explanation: [{
                        action: 'REDEEM',
                        detail: redeemTx.description || `Redeemed ${Math.abs(redeemTx.points)} points`,
                        points: redeemTx.points
                    }],
                    createdAt: redeemTx.createdAt
                })
            }

            return NextResponse.json({
                transactionId,
                type: 'NONE',
                explanation: [{ action: 'NO_LOYALTY', detail: 'No loyalty points were earned on this transaction. The customer may not have been enrolled or identified at checkout.' }]
            })
        }

        // Parse metadata
        let metadata = null
        let breakdown: Array<{
            itemName: string
            points: number
            ruleApplied: string
            excluded: boolean
            reason?: string
        }> = []

        if (pointsTx.metadata) {
            try {
                metadata = JSON.parse(pointsTx.metadata)
                breakdown = metadata.breakdown || []
            } catch { /* ignore */ }
        }

        // Build rich explanation
        const explanation = []

        // Header
        explanation.push({
            action: 'EARN',
            detail: `${pointsTx.points} points earned from this transaction`,
            points: pointsTx.points
        })

        // Smart Rewards status
        if (metadata?.smartRewardsActive) {
            explanation.push({
                action: 'ENGINE',
                detail: `Smart Rewards active (${metadata.rulesCount || 0} rules evaluated)`
            })
        } else {
            explanation.push({
                action: 'ENGINE',
                detail: 'Flat rate earning (Smart Rewards not active)'
            })
        }

        // Eligible vs excluded
        if (metadata) {
            explanation.push({
                action: 'TOTALS',
                detail: `Eligible spend: $${(metadata.eligibleTotal || 0).toFixed(2)} | Excluded: $${(metadata.excludedTotal || 0).toFixed(2)}`
            })
        }

        // Per-item breakdown
        const itemExplanations = breakdown.map(b => ({
            itemName: b.itemName,
            points: b.points,
            rule: b.ruleApplied,
            excluded: b.excluded,
            reason: b.excluded ? (b.reason || 'Excluded category') : undefined,
            detail: b.excluded
                ? `⊘ ${b.itemName}: excluded — ${b.reason || b.ruleApplied}`
                : `✓ ${b.itemName}: +${b.points} pts via ${b.ruleApplied}`
        }))

        return NextResponse.json({
            transactionId,
            type: 'EARN',
            points: pointsTx.points,
            description: pointsTx.description,
            member: pointsTx.member,
            program: pointsTx.program,
            createdAt: pointsTx.createdAt,

            explanation,
            itemBreakdown: itemExplanations,

            metadata: metadata || null,
            hasStructuredMetadata: !!metadata
        })
    } catch (error) {
        console.error('[LOYALTY_EXPLAIN_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * POST /api/loyalty/explain
 * 
 * Simulate/dry-run: evaluate a cart against current rules WITHOUT awarding points.
 * Useful for debugging and testing rules.
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { items } = await req.json()

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 })
        }

        const franchiseId = user.franchiseId

        // Get loyalty program with rules
        const program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId },
            include: {
                rules: {
                    where: { isActive: true },
                    orderBy: { priority: 'asc' }
                }
            }
        })

        if (!program || !program.isEnabled) {
            return NextResponse.json({
                simulation: true,
                totalPoints: 0,
                breakdown: [],
                explanation: [{ action: 'DISABLED', detail: 'Loyalty program not enabled' }]
            })
        }

        const globalRate = Number(program.pointsPerDollar)
        const rules = program.useSmartRewards ? program.rules : []

        const builtInExcludedCategories = ['lottery', 'gift card', 'gift_card', 'giftcard']
        const builtInExcludedNames = ['lottery', 'gift card']

        const breakdown: Array<{
            itemName: string
            points: number
            ruleApplied: string
            ruleName: string
            excluded: boolean
            reason?: string
            itemTotal: number
        }> = []

        let eligibleTotal = 0
        let excludedTotal = 0
        let totalPoints = 0

        for (const item of items) {
            const catLower = (item.category || '').toLowerCase()
            const nameLower = (item.name || '').toLowerCase()
            const itemTotal = Number(item.price) * Number(item.quantity)

            // Built-in exclusions
            const isBuiltInExcluded =
                item.isTobacco ||
                builtInExcludedCategories.some((ex: string) => catLower.includes(ex)) ||
                builtInExcludedNames.some((ex: string) => nameLower.includes(ex))

            if (isBuiltInExcluded) {
                excludedTotal += itemTotal
                breakdown.push({
                    itemName: item.name,
                    points: 0,
                    ruleApplied: 'BUILT_IN_EXCLUSION',
                    ruleName: 'System Exclusion',
                    excluded: true,
                    reason: item.isTobacco ? 'Tobacco product' : 'Excluded category (lottery/gift card)',
                    itemTotal
                })
                continue
            }

            // Smart Rewards rules
            if (program.useSmartRewards && rules.length > 0) {
                let matched = false

                for (const rule of rules) {
                    let ruleMatches = false

                    switch (rule.type) {
                        case 'EXCLUSION':
                            if (rule.category && catLower === rule.category.toLowerCase()) ruleMatches = true
                            if (rule.upc && item.upc === rule.upc) ruleMatches = true
                            if (ruleMatches) {
                                excludedTotal += itemTotal
                                breakdown.push({
                                    itemName: item.name,
                                    points: 0,
                                    ruleApplied: `EXCLUSION: ${rule.name}`,
                                    ruleName: rule.name,
                                    excluded: true,
                                    reason: `Excluded by rule: ${rule.name}`,
                                    itemTotal
                                })
                                matched = true
                            }
                            break

                        case 'PRODUCT':
                            if (rule.upc && item.upc === rule.upc) {
                                const pts = calculateRulePoints(rule, itemTotal, Number(item.quantity))
                                eligibleTotal += itemTotal
                                totalPoints += pts
                                breakdown.push({
                                    itemName: item.name,
                                    points: pts,
                                    ruleApplied: `PRODUCT: ${rule.name}`,
                                    ruleName: rule.name,
                                    excluded: false,
                                    itemTotal
                                })
                                matched = true
                            }
                            break

                        case 'CATEGORY':
                            if (rule.category && catLower === rule.category.toLowerCase()) {
                                const pts = calculateRulePoints(rule, itemTotal, Number(item.quantity))
                                eligibleTotal += itemTotal
                                totalPoints += pts
                                breakdown.push({
                                    itemName: item.name,
                                    points: pts,
                                    ruleApplied: `CATEGORY: ${rule.name}`,
                                    ruleName: rule.name,
                                    excluded: false,
                                    itemTotal
                                })
                                matched = true
                            }
                            break
                    }

                    if (matched) break
                }

                if (!matched) {
                    const pts = Math.floor(itemTotal * globalRate)
                    eligibleTotal += itemTotal
                    totalPoints += pts
                    breakdown.push({
                        itemName: item.name,
                        points: pts,
                        ruleApplied: 'GLOBAL_DEFAULT',
                        ruleName: `Default (${globalRate} pts/$1)`,
                        excluded: false,
                        itemTotal
                    })
                }
            } else {
                const pts = Math.floor(itemTotal * globalRate)
                eligibleTotal += itemTotal
                totalPoints += pts
                breakdown.push({
                    itemName: item.name,
                    points: pts,
                    ruleApplied: 'FLAT_RATE',
                    ruleName: `Flat Rate (${globalRate} pts/$1)`,
                    excluded: false,
                    itemTotal
                })
            }
        }

        return NextResponse.json({
            simulation: true,
            totalPoints,
            eligibleTotal: Math.round(eligibleTotal * 100) / 100,
            excludedTotal: Math.round(excludedTotal * 100) / 100,
            smartRewardsActive: program.useSmartRewards,
            rulesCount: rules.length,
            breakdown,
            activeRules: rules.map(r => ({
                id: r.id,
                name: r.name,
                type: r.type,
                category: r.category,
                upc: r.upc,
                earnMode: r.earnMode,
                priority: r.priority
            }))
        })
    } catch (error) {
        console.error('[LOYALTY_EXPLAIN_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

function calculateRulePoints(
    rule: { earnMode: string; pointsPerDollar: any; fixedPointsPerUnit: any; multiplier: any },
    itemTotal: number,
    quantity: number
): number {
    switch (rule.earnMode) {
        case 'PER_DOLLAR':
            return Math.floor(itemTotal * Number(rule.pointsPerDollar || 1))
        case 'PER_UNIT':
            return (Number(rule.fixedPointsPerUnit) || 0) * quantity
        case 'MULTIPLIER':
            return Math.floor(itemTotal * Number(rule.multiplier || 1))
        default:
            return Math.floor(itemTotal * Number(rule.pointsPerDollar || 1))
    }
}
