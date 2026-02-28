import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Search members, view activity across all stores
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')
        const type = searchParams.get('type') || 'search' // search, stats, top-members

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Get loyalty program for this franchise
        let program: any = null
        if (franchiseId) {
            program = await prisma.loyaltyProgram.findUnique({
                where: { franchiseId },
                select: {
                    id: true,
                    name: true,
                    isEnabled: true,
                    pointsPerDollar: true,
                    redemptionRatio: true
                }
            })
        }

        if (type === 'search' && phone) {
            // Search for member by phone
            const members = await prisma.loyaltyMember.findMany({
                where: {
                    phone: { contains: phone },
                    ...(franchiseId ? { program: { franchiseId } } : {})
                },
                include: {
                    program: {
                        select: {
                            id: true,
                            name: true,
                            franchise: { select: { name: true } }
                        }
                    },
                    masterAccount: {
                        select: {
                            id: true,
                            pooledBalance: true,
                            lifetimePoints: true
                        }
                    }
                },
                take: 20
            })

            return NextResponse.json({
                program,
                members: members.map(m => ({
                    id: m.id,
                    phone: m.phone,
                    email: m.email,
                    name: m.name,
                    pointsBalance: m.pointsBalance,
                    lifetimePoints: m.lifetimePoints,
                    lifetimeSpend: Number(m.lifetimeSpend),
                    programName: m.program.name,
                    franchiseName: m.program.franchise?.name,
                    enrolledAt: m.enrolledAt,
                    lastActivity: m.lastActivity,
                    isCrossStore: !!m.masterAccountId,
                    pooledBalance: m.masterAccount?.pooledBalance || 0
                }))
            })
        }

        if (type === 'stats') {
            // Get loyalty program stats
            if (!program) {
                return NextResponse.json({ program: null, stats: null })
            }

            const memberCount = await prisma.loyaltyMember.count({
                where: { programId: program.id }
            })

            const totalPointsResult = await prisma.loyaltyMember.aggregate({
                where: { programId: program.id },
                _sum: { pointsBalance: true, lifetimePoints: true, lifetimeSpend: true }
            })

            const activeMembers = await prisma.loyaltyMember.count({
                where: {
                    programId: program.id,
                    lastActivity: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            })

            return NextResponse.json({
                program,
                stats: {
                    totalMembers: memberCount,
                    activeMembers,
                    totalPointsOutstanding: totalPointsResult._sum.pointsBalance || 0,
                    totalLifetimePoints: totalPointsResult._sum.lifetimePoints || 0,
                    totalLifetimeSpend: Number(totalPointsResult._sum.lifetimeSpend || 0)
                }
            })
        }

        if (type === 'top-members') {
            // Get top spending members
            if (!program) {
                return NextResponse.json({ program: null, topMembers: [] })
            }

            const topMembers = await prisma.loyaltyMember.findMany({
                where: { programId: program.id },
                orderBy: { lifetimeSpend: 'desc' },
                take: 20,
                select: {
                    id: true,
                    phone: true,
                    name: true,
                    pointsBalance: true,
                    lifetimeSpend: true,
                    lastActivity: true
                }
            })

            return NextResponse.json({
                program,
                topMembers: topMembers.map(m => ({
                    ...m,
                    lifetimeSpend: Number(m.lifetimeSpend)
                }))
            })
        }

        return NextResponse.json({ program })

    } catch (error) {
        console.error('Loyalty GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Enroll member, add/redeem points
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { action, phone, email, name, points, amount, transactionId, locationId, excludeTobaccoAmount } = body
        // action: 'enroll', 'earn', 'redeem'
        // excludeTobaccoAmount: total $ value of tobacco items in the transaction (excluded from points)

        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
        }

        // Get or create loyalty program
        let program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId }
        })

        if (!program) {
            program = await prisma.loyaltyProgram.create({
                data: { franchiseId, name: 'Rewards', isEnabled: true }
            })
        }

        if (action === 'enroll') {
            if (!phone) {
                return NextResponse.json({ error: 'Phone required' }, { status: 400 })
            }

            // Check if already enrolled
            const existing = await prisma.loyaltyMember.findUnique({
                where: { programId_phone: { programId: program.id, phone } }
            })

            if (existing) {
                return NextResponse.json({
                    success: true,
                    member: existing,
                    message: 'Member already enrolled'
                })
            }

            const member = await prisma.loyaltyMember.create({
                data: {
                    programId: program.id,
                    phone,
                    email,
                    name
                }
            })

            return NextResponse.json({ success: true, member })
        }

        if (action === 'earn') {
            if (!phone || !amount) {
                return NextResponse.json({ error: 'Phone and amount required' }, { status: 400 })
            }

            // Find member
            const member = await prisma.loyaltyMember.findUnique({
                where: { programId_phone: { programId: program.id, phone } }
            })

            if (!member) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 })
            }

            // Calculate eligible spend (exclude tobacco if program says so)
            let eligibleAmount = Number(amount)
            const tobaccoExcluded = Number(excludeTobaccoAmount || 0)

            // If program has excludeTobacco flag (stored in metadata) OR if tobacco amount passed, exclude it
            if (tobaccoExcluded > 0) {
                eligibleAmount = Math.max(0, eligibleAmount - tobaccoExcluded)
            }

            // Calculate points earned (only on eligible non-tobacco spend)
            const pointsEarned = Math.floor(eligibleAmount * Number(program.pointsPerDollar))

            // Update member
            await prisma.loyaltyMember.update({
                where: { id: member.id },
                data: {
                    pointsBalance: { increment: pointsEarned },
                    lifetimePoints: { increment: pointsEarned },
                    lifetimeSpend: { increment: Number(amount) }, // Track FULL spend for reporting
                    lastActivity: new Date()
                }
            })

            // Log points transaction
            await prisma.pointsTransaction.create({
                data: {
                    programId: program.id,
                    memberId: member.id,
                    type: 'EARN',
                    points: pointsEarned,
                    transactionId,
                    locationId,
                    description: tobaccoExcluded > 0
                        ? `Earned on $${eligibleAmount.toFixed(2)} (excl. $${tobaccoExcluded.toFixed(2)} tobacco)`
                        : `Earned on $${amount} purchase`
                }
            })

            return NextResponse.json({
                success: true,
                pointsEarned,
                eligibleAmount,
                tobaccoExcluded: tobaccoExcluded,
                newBalance: member.pointsBalance + pointsEarned
            })
        }

        if (action === 'redeem') {
            if (!phone || !points) {
                return NextResponse.json({ error: 'Phone and points required' }, { status: 400 })
            }

            // Find member
            const member = await prisma.loyaltyMember.findUnique({
                where: { programId_phone: { programId: program.id, phone } }
            })

            if (!member) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 })
            }

            if (member.pointsBalance < points) {
                return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
            }

            // Calculate dollar value
            const dollarValue = points * Number(program.redemptionRatio)

            // Update member
            await prisma.loyaltyMember.update({
                where: { id: member.id },
                data: {
                    pointsBalance: { decrement: points },
                    lastActivity: new Date()
                }
            })

            // Log redemption
            await prisma.pointsTransaction.create({
                data: {
                    programId: program.id,
                    memberId: member.id,
                    type: 'REDEEM',
                    points: -points,
                    transactionId,
                    locationId,
                    description: `Redeemed for $${dollarValue.toFixed(2)} discount`
                }
            })

            return NextResponse.json({
                success: true,
                pointsRedeemed: points,
                dollarValue,
                newBalance: member.pointsBalance - points
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Loyalty POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Update program settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            isEnabled,
            pointsPerDollar,
            redemptionRatio,
            // These are returned to the POS client so it knows what to exclude
            // The POS client then sends excludeTobaccoAmount with earn requests
            excludeTobacco,
            excludeAlcohol,
            excludeLottery,
            redemptionTiers    // e.g., [{ points: 100, dollars: 5 }, { points: 200, dollars: 10 }]
        } = body

        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
        }

        const program = await prisma.loyaltyProgram.upsert({
            where: { franchiseId },
            create: {
                franchiseId,
                name: name || 'Rewards',
                isEnabled: isEnabled ?? true,
                pointsPerDollar: pointsPerDollar || 1,
                redemptionRatio: redemptionRatio || 0.01
            },
            update: {
                ...(name !== undefined && { name }),
                ...(isEnabled !== undefined && { isEnabled }),
                ...(pointsPerDollar !== undefined && { pointsPerDollar }),
                ...(redemptionRatio !== undefined && { redemptionRatio })
            }
        })

        // Return program with exclusion defaults
        // The POS client reads these to know what to exclude from point earning
        return NextResponse.json({
            success: true,
            program,
            exclusionSettings: {
                excludeTobacco: excludeTobacco ?? true,     // Default: YES exclude tobacco
                excludeAlcohol: excludeAlcohol ?? false,    // Default: NO (most stores give points on alcohol)
                excludeLottery: excludeLottery ?? true,     // Default: YES exclude lottery
            },
            redemptionTiers: redemptionTiers || [
                { points: 100, dollars: 5 },
                { points: 200, dollars: 10 },
                { points: 500, dollars: 50 }
            ]
        })

    } catch (error) {
        console.error('Loyalty PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

