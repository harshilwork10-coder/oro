import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        const loyaltyProgram = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId }
        })

        return NextResponse.json(loyaltyProgram)
    } catch (error) {
        console.error('Error fetching loyalty program:', error)
        return NextResponse.json({ error: 'Failed to fetch loyalty program' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { franchiseId, isEnabled, pointsPerDollar, redemptionRatio } = body

        const loyaltyProgram = await prisma.loyaltyProgram.upsert({
            where: { franchiseId },
            create: {
                franchiseId,
                isEnabled: isEnabled !== undefined ? isEnabled : true,
                pointsPerDollar: parseFloat(pointsPerDollar || '1.0'),
                redemptionRatio: parseFloat(redemptionRatio || '0.01')
            },
            update: {
                isEnabled,
                pointsPerDollar: parseFloat(pointsPerDollar),
                redemptionRatio: parseFloat(redemptionRatio)
            }
        })

        console.log(`✅ Loyalty program ${loyaltyProgram.isEnabled ? 'enabled' : 'disabled'} for franchise`)

        return NextResponse.json(loyaltyProgram)
    } catch (error) {
        console.error('Error updating loyalty program:', error)
        return NextResponse.json({ error: 'Failed to update loyalty program' }, { status: 500 })
    }
}
