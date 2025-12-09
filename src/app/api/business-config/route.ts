import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only FRANCHISOR role can access business config
        if (session.user.role !== 'FRANCHISOR' && session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get user's franchisor record
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisor: {
                    include: {
                        config: true
                    }
                }
            }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'No franchisor found' }, { status: 404 })
        }

        // Return existing config or default values
        const config = user.franchisor.config || {
            id: null,
            franchisorId: user.franchisor.id,
            usesCommissions: true,
            usesInventory: true,
            usesAppointments: true,
            usesScheduling: true,
            usesVirtualKeypad: true,
            usesLoyalty: true,
            usesGiftCards: true,
            usesMemberships: true,
            usesReferrals: true,
            usesRoyalties: false,
            usesTipping: true,
            usesDiscounts: true,
            taxRate: 0.08,
            taxServices: true,
            taxProducts: true,
            usesRetailProducts: true,
            usesServices: true,
            usesEmailMarketing: true,
            usesSMSMarketing: true,
            usesReviewManagement: true,
            usesMultiLocation: false,
            usesFranchising: false,
            usesTimeTracking: true,
            usesPayroll: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        return NextResponse.json(config)

    } catch (error) {
        console.error('Error fetching business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER role can update business config
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only Provider can configure business settings' }, { status: 403 })
        }

        const body = await req.json()

        // Get user's franchisor record
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisor: true
            }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'No franchisor found' }, { status: 404 })
        }

        // Upsert config (create if doesn't exist, update if exists)
        const config = await prisma.businessConfig.upsert({
            where: { franchisorId: user.franchisor.id },
            create: {
                franchisorId: user.franchisor.id,
                ...body
            },
            update: body
        })

        return NextResponse.json({ success: true, config })

    } catch (error) {
        console.error('Error updating business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
