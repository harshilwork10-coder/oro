import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/loyalty/audit
 *
 * Support/debug visibility endpoint for transaction-level loyalty audit.
 * Shows why points were earned, matched rules, excluded items, and full metadata breakdown.
 *
 * Query params:
 *   ?transactionId=xxx   — audit one specific sale transaction
 *   ?memberId=xxx        — all loyalty activity for a member
 *   ?phone=xxx           — lookup by phone (resolves to member)
 *   ?date=YYYY-MM-DD     — all activity on a date
 *   ?limit=50            — max results (default 50)
 *   ?type=EARN|REDEEM|ADJUST — filter by transaction type
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const transactionId = searchParams.get('transactionId')
        const memberId = searchParams.get('memberId')
        const phone = searchParams.get('phone')
        const dateParam = searchParams.get('date')
        const typeFilter = searchParams.get('type')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

        const franchiseId = user.franchiseId

        // Build where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {}

        // Scope to franchise
        const program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId }
        })
        if (program) {
            where.programId = program.id
        }

        // Filters
        if (transactionId) {
            where.transactionId = transactionId
        }

        if (memberId) {
            where.memberId = memberId
        }

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '')
            if (program) {
                const member = await prisma.loyaltyMember.findUnique({
                    where: { programId_phone: { programId: program.id, phone: cleanPhone } }
                })
                if (member) {
                    where.memberId = member.id
                } else {
                    return NextResponse.json({ transactions: [], member: null, message: 'Member not found' })
                }
            }
        }

        if (dateParam) {
            const startOfDay = new Date(dateParam)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(startOfDay)
            endOfDay.setDate(endOfDay.getDate() + 1)
            where.createdAt = { gte: startOfDay, lt: endOfDay }
        }

        if (typeFilter && ['EARN', 'REDEEM', 'ADJUST'].includes(typeFilter)) {
            where.type = typeFilter
        }

        // Fetch transactions with member info
        const transactions = await prisma.pointsTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                member: {
                    select: {
                        id: true,
                        phone: true,
                        name: true,
                        email: true,
                        pointsBalance: true,
                        lifetimePoints: true,
                        lifetimeSpend: true,
                        lastActivity: true
                    }
                }
            }
        })

        // Parse metadata for each transaction
        const auditEntries = transactions.map(tx => {
            let parsedMetadata = null
            let breakdown: Array<{
                itemName: string
                points: number
                ruleApplied: string
                excluded: boolean
                reason?: string
            }> = []
            let eligibleTotal = 0
            let excludedTotal = 0
            let smartRewardsActive = false
            let rulesCount = 0

            if (tx.metadata) {
                try {
                    parsedMetadata = JSON.parse(tx.metadata)
                    breakdown = parsedMetadata.breakdown || []
                    eligibleTotal = parsedMetadata.eligibleTotal || 0
                    excludedTotal = parsedMetadata.excludedTotal || 0
                    smartRewardsActive = parsedMetadata.smartRewardsActive || false
                    rulesCount = parsedMetadata.rulesCount || 0
                } catch { /* ignore parse errors */ }
            }

            // Build human-readable explanation
            const earnExplanation = breakdown.map(b => {
                if (b.excluded) {
                    return `⊘ ${b.itemName}: excluded (${b.reason || b.ruleApplied})`
                }
                return `✓ ${b.itemName}: +${b.points} pts (${b.ruleApplied})`
            })

            // Summarize rules hit
            const ruleHits: Record<string, number> = {}
            breakdown.forEach(b => {
                const rule = b.ruleApplied || 'UNKNOWN'
                ruleHits[rule] = (ruleHits[rule] || 0) + 1
            })

            return {
                id: tx.id,
                type: tx.type,
                points: tx.points,
                description: tx.description,
                transactionId: tx.transactionId,
                locationId: tx.locationId,
                createdAt: tx.createdAt,
                member: tx.member,

                // Parsed metadata
                metadata: {
                    eligibleTotal,
                    excludedTotal,
                    smartRewardsActive,
                    rulesCount,
                    breakdown
                },

                // Human-readable
                earnExplanation,
                ruleHits,
                hasMetadata: !!tx.metadata
            }
        })

        // Member summary (if querying by member)
        let memberSummary = null
        if ((memberId || phone) && auditEntries.length > 0 && auditEntries[0].member) {
            const m = auditEntries[0].member
            memberSummary = {
                id: m.id,
                phone: m.phone,
                name: m.name,
                email: m.email,
                pointsBalance: m.pointsBalance,
                lifetimePoints: m.lifetimePoints,
                lifetimeSpend: Number(m.lifetimeSpend),
                lastActivity: m.lastActivity,
                transactionCount: auditEntries.length
            }
        }

        return NextResponse.json({
            transactions: auditEntries,
            memberSummary,
            count: auditEntries.length,
            franchiseId
        })
    } catch (error) {
        console.error('[LOYALTY_AUDIT]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
