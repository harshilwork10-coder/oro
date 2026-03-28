import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST - Add credits to a franchise
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can add credits' }, { status: 403 })
        }

        const body = await req.json()
        const { franchiseId, credits } = body

        if (!franchiseId || !credits || credits <= 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        // Upsert credits
        const smsCredits = await prisma.smsCredits.upsert({
            where: { franchiseId },
            update: {
                creditsRemaining: { increment: credits },
                lastTopupAt: new Date(),
                lastPackage: `${credits} credits`
            },
            create: {
                franchiseId,
                creditsRemaining: credits,
                lastTopupAt: new Date(),
                lastPackage: `${credits} credits`
            }
        })

        return NextResponse.json({
            success: true,
            creditsRemaining: smsCredits.creditsRemaining
        })
    } catch (error) {
        console.error('Error adding credits:', error)
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }
}

