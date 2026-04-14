import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'OWNER' && user.role !== 'FRANCHISOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            name,
            code,
            customerLabel,
            goal,
            punchesRequired,
            rewardType,
            rewardValue,
            timingWindowDays,
            rewardExpiryDays,
            stackWithDiscounts,
            autoEnroll
        } = body

        if (!name || !code || !punchesRequired) {
            return NextResponse.json({ error: 'Missing required configuration' }, { status: 400 })
        }

        // 1. Identify context (Franchisor sets it globally for franchise, Owner sets it locally)
        const locationId = user.role === 'OWNER' ? user.locationId : null
        const franchiseId = user.role === 'FRANCHISOR' ? user.franchiseId : null
        
        // Safety check
        if (!locationId && !franchiseId) {
             return NextResponse.json({ error: 'No location or franchise context found for user' }, { status: 400 })
        }

        const newProgram = await prisma.salonLoyaltyProgram.create({
            data: {
                name,
                code,
                customerLabel,
                goal,
                punchesRequired,
                rewardType,
                rewardValue: rewardValue || 0,
                timingWindowDays: timingWindowDays || null,
                rewardExpiryDays: rewardExpiryDays || null,
                stackWithDiscounts: stackWithDiscounts || false,
                autoEnroll: autoEnroll || false,
                status: 'ACTIVE',
                
                locationId,
                franchiseId,
                appliesToSameLocationOnly: user.role === 'OWNER' ? true : false,
                
                // Establish extremely loose default rule for now: ANY service qualifies
                rules: {
                    create: {
                        ruleType: 'INCLUDE_CATEGORY',
                        targetId: 'ALL' // Pseudo-code. Engine resolves this as ANY Service.
                    }
                }
            }
        })

        // Also enable the feature gate for the system
        if (franchiseId) {
            const settingsCount = await prisma.franchiseSettings.count({ where: { franchiseId }})
            if (settingsCount > 0) {
                 await prisma.franchiseSettings.update({
                    where: { franchiseId },
                    data: { usesSalonLoyalty: true }
                 })
            }
        }

        return NextResponse.json({ success: true, program: newProgram })
    } catch (e: any) {
        console.error('[SALON_LOYALTY_PROGRAM_CREATE_ERROR]', e)
        if (e.code === 'P2002') return NextResponse.json({ error: 'Program code already exists' }, { status: 400 })
        return NextResponse.json({ error: 'Failed to save Loyalty Program' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user || !user.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const locationId = user.locationId
        const franchiseId = user.franchiseId

        // Look for location specific or franchise-wide programs
        const program = await prisma.salonLoyaltyProgram.findFirst({
            where: {
                status: 'ACTIVE',
                OR: [
                    { appliesToSameLocationOnly: true, locationId },
                    { appliesToSameLocationOnly: false, franchiseId }
                ]
            },
            include: { rules: true }
        })

        if (!program) {
            return NextResponse.json({ success: true, program: null })
        }

        return NextResponse.json({ success: true, program })
    } catch (e) {
        console.error('[SALON_LOYALTY_PROGRAM_GET_ERROR]', e)
        return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 })
    }
}
