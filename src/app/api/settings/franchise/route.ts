import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch franchise settings
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        // Get or create settings
        let settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) {
            // Create default settings
            settings = await prisma.franchiseSettings.create({
                data: {
                    franchiseId: user.franchiseId,
                    pricingModel: 'DUAL_PRICING',
                    cardSurchargeType: 'PERCENTAGE',
                    cardSurcharge: 3.99
                }
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error fetching franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST: Update franchise settings
export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const body = await request.json()
        const { pricingModel, cardSurchargeType, cardSurcharge } = body

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: {
                pricingModel,
                cardSurchargeType,
                cardSurcharge
            },
            create: {
                franchiseId: user.franchiseId,
                pricingModel,
                cardSurchargeType,
                cardSurcharge
            }
        })

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error updating franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
