import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
    LoyaltyEvaluationItem, 
    filterQualifyingItems, 
    calculatePotentialPunches 
} from '@/lib/loyalty/program-rules'
import { ensureMembership, getEffectivePunches } from '@/lib/loyalty/membership-service'
import { isFeatureEnabledForFranchise } from '@/lib/featureGate'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { clientId, locationId, items } = body

        if (!locationId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Feature flag gate
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { franchiseId: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Invalid locationId' }, { status: 404 })
        }

        const isEnabled = await isFeatureEnabledForFranchise(location.franchiseId, 'usesSalonLoyalty')
        if (!isEnabled) {
            return NextResponse.json({ activePrograms: [] }) // Gracefully degrade if off
        }

        if (!clientId) {
            // Cannot evaluate progress without a client
            return NextResponse.json({ activePrograms: [] })
        }

        // 1. Fetch active programs targeting this location or franchise
        const activePrograms = await prisma.salonLoyaltyProgram.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { appliesToSameLocationOnly: true, locationId },
                    { appliesToSameLocationOnly: false, franchiseId: location.franchiseId }
                ]
            },
            include: {
                rules: true
            }
        })

        if (activePrograms.length === 0) {
            return NextResponse.json({ activePrograms: [] })
        }

        const results = []

        for (const program of activePrograms) {
            // Check if cart has qualifying items
            const evalItems = items as LoyaltyEvaluationItem[]
            const qualifyingItems = filterQualifyingItems(evalItems, program.rules, program, locationId)
            
            const potentialPunches = calculatePotentialPunches(qualifyingItems, program)

            // Look up membership but strictly DO NOT auto-enroll during preview
            const membership = await ensureMembership(
                clientId, 
                program.id, 
                locationId, 
                false // Explicitly FALSE to guarantee preview is 100% read-only
            )

            // If no membership exists, hypothetical progress is 0
            const effectivePunches = membership ? getEffectivePunches(membership, program) : 0
            
            const totalIfCheckoutCompletes = effectivePunches + potentialPunches
            const threshold = program.punchesRequired || 5
            
            const rewardsPreviouslyUnlocked = membership ? (membership.rewardsUnlocked - membership.rewardsRedeemed) : 0
            const willUnlockNewReward = totalIfCheckoutCompletes >= threshold

            results.push({
                programId: program.id,
                programName: program.name,
                customerLabel: program.customerLabel,
                progress: effectivePunches,
                threshold: threshold,
                earningToday: potentialPunches,
                newProgress: totalIfCheckoutCompletes % threshold, // e.g. 5/5 -> resets to 0 progress towards next
                rewardAvailableNow: rewardsPreviouslyUnlocked > 0,
                willUnlockToday: willUnlockNewReward && (effectivePunches < threshold)
            })
        }

        return NextResponse.json({ activePrograms: results })

    } catch (error: any) {
        console.error('[LOYALTY PREVIEW ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
