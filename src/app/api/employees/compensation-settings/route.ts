import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get current user's active compensation plan settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
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
