import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/loyalty/calculate-earn
 * 
 * Calculates loyalty points for a cart using Smart Rewards rules.
 * If useSmartRewards is false, falls back to flat rate.
 * 
 * Request body: { franchiseId, items: [{ name, category, upc, price, quantity, isTobacco }] }
 * Response: { totalPoints, breakdown: [{ itemName, points, ruleApplied, excluded }], eligibleTotal, excludedTotal }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { items } = await req.json()

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 })
        }

        const franchiseId = user.franchiseId

        // Get loyalty program
        const program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId },
            include: {
                rules: {
                    where: { isActive: true },
                    orderBy: { priority: 'asc' } // Lower priority number = higher priority
                }
            }
        })

        if (!program || !program.isEnabled) {
            return NextResponse.json({
                totalPoints: 0,
                breakdown: [],
                eligibleTotal: 0,
                excludedTotal: 0,
                reason: 'Loyalty program not enabled'
            })
        }

        const globalRate = Number(program.pointsPerDollar)
        const rules = program.useSmartRewards ? program.rules : []

        // Built-in exclusions (always active regardless of Smart Rewards)
        const builtInExcludedCategories = ['lottery', 'gift card', 'gift_card', 'giftcard']
        const builtInExcludedNames = ['lottery', 'gift card']

        const breakdown: Array<{
            itemName: string
            points: number
            ruleApplied: string
            excluded: boolean
            reason?: string
        }> = []

        let eligibleTotal = 0
        let excludedTotal = 0
        let totalPoints = 0

        for (const item of items) {
            const catLower = (item.category || '').toLowerCase()
            const nameLower = (item.name || '').toLowerCase()
            const itemTotal = Number(item.price) * Number(item.quantity)

            // Step 1: Check built-in exclusions (tobacco, lottery, gift cards)
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
                    excluded: true,
                    reason: item.isTobacco ? 'Tobacco' : 'Excluded category'
                })
                continue
            }

            // Step 2: If Smart Rewards, evaluate rules in priority order
            if (program.useSmartRewards && rules.length > 0) {
                let matched = false

                for (const rule of rules) {
                    let ruleMatches = false

                    switch (rule.type) {
                        case 'EXCLUSION':
                            // Category-based exclusion rule
                            if (rule.category && catLower === rule.category.toLowerCase()) {
                                ruleMatches = true
                            }
                            // UPC-based exclusion
                            if (rule.upc && item.upc === rule.upc) {
                                ruleMatches = true
                            }
                            if (ruleMatches) {
                                excludedTotal += itemTotal
                                breakdown.push({
                                    itemName: item.name,
                                    points: 0,
                                    ruleApplied: `EXCLUSION: ${rule.name}`,
                                    excluded: true,
                                    reason: rule.name
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
                                    excluded: false
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
                                    excluded: false
                                })
                                matched = true
                            }
                            break
                    }

                    if (matched) break // First matching rule wins (priority order)
                }

                // Fallback to global rate if no rule matched
                if (!matched) {
                    const pts = Math.floor(itemTotal * globalRate)
                    eligibleTotal += itemTotal
                    totalPoints += pts
                    breakdown.push({
                        itemName: item.name,
                        points: pts,
                        ruleApplied: 'GLOBAL_DEFAULT',
                        excluded: false
                    })
                }
            } else {
                // No Smart Rewards — flat rate
                const pts = Math.floor(itemTotal * globalRate)
                eligibleTotal += itemTotal
                totalPoints += pts
                breakdown.push({
                    itemName: item.name,
                    points: pts,
                    ruleApplied: 'FLAT_RATE',
                    excluded: false
                })
            }
        }

        return NextResponse.json({
            totalPoints,
            breakdown,
            eligibleTotal: Math.round(eligibleTotal * 100) / 100,
            excludedTotal: Math.round(excludedTotal * 100) / 100,
            smartRewardsActive: program.useSmartRewards,
            rulesCount: rules.length
        })
    } catch (error) {
        console.error('[LOYALTY_CALCULATE_EARN]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * Calculate points from a rule based on earn mode
 */
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
