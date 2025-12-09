import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Add credits to a franchise
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can add credits' }, { status: 403 })
        }

        const body = await request.json()
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
