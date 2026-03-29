import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get current user's active compensation plan settings
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get the active compensation plan (no effectiveTo date)
        const compensationPlan = await prisma.compensationPlan.findFirst({
            where: {
                userId: user.id,
                effectiveTo: null // Active plan
            },
            orderBy: {
                effectiveFrom: 'desc'
            }
        })

        if (!compensationPlan) {
            // Return defaults if no compensation plan exists
            return NextResponse.json({
                compensationType: null,
                requiresTimeClock: false,
                canSetOwnPrices: false,
            })
        }

        return NextResponse.json({
            compensationType: compensationPlan.compensationType,
            requiresTimeClock: compensationPlan.requiresTimeClock,
            canSetOwnPrices: compensationPlan.canSetOwnPrices,
            commissionSplit: compensationPlan.commissionSplit,
            hourlyRate: compensationPlan.hourlyRate,
            salaryAmount: compensationPlan.salaryAmount,
            chairRentAmount: compensationPlan.chairRentAmount,
        })
    } catch (error) {
        console.error('Error fetching compensation settings:', error)
        return NextResponse.json({ error: 'Failed to fetch compensation settings' }, { status: 500 })
    }
}
