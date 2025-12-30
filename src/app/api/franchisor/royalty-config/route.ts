import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisor: {
                    include: {
                        royaltyConfig: true
                    }
                }
            }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'User is not a franchisor' }, { status: 403 })
        }

        return NextResponse.json(user.franchisor.royaltyConfig)
    } catch (error) {
        console.error('Error fetching royalty config:', error)
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { franchisor: true }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'User is not a franchisor' }, { status: 403 })
        }

        const body = await request.json()
        const { percentage, minimumMonthlyFee, calculationPeriod } = body

        if (!percentage || percentage < 0 || percentage > 100) {
            return NextResponse.json({ error: 'Valid percentage is required (0-100)' }, { status: 400 })
        }

        // Upsert (create or update)
        const config = await prisma.royaltyConfig.upsert({
            where: { franchisorId: user.franchisor.id },
            update: {
                percentage,
                minimumMonthlyFee,
                calculationPeriod
            },
            create: {
                franchisorId: user.franchisor.id,
                percentage,
                minimumMonthlyFee,
                calculationPeriod
            }
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error saving royalty config:', error)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }
}

