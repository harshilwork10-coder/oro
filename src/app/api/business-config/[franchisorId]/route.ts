import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ franchisorId: string }> }
) {
    const { franchisorId } = await params

    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can access other franchisors' configs
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Verify franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: { config: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Return existing config or default values
        const config = franchisor.config || {
            id: null,
            franchisorId: franchisor.id,
            usesCommissions: true,
            usesInventory: true,
            usesAppointments: true,
            usesScheduling: true,
            usesLoyalty: true,
            usesGiftCards: true,
            usesMemberships: true,
            usesReferrals: true,
            usesRoyalties: false,
            usesTipping: true,
            usesDiscounts: true,
            usesRetailProducts: true,
            usesServices: true,
            usesEmailMarketing: true,
            usesSMSMarketing: true,
            usesReviewManagement: true,
            usesMultiLocation: false,
            usesFranchising: false,
            usesTimeTracking: true,
            usesPayroll: false,
            // Cash Discount settings
            cashDiscountEnabled: false,
            cashDiscountPercent: 3.5,
            // Workflow settings
            reviewRequestTiming: 'MANUAL',
            commissionCalculation: 'AUTOMATIC',
            commissionVisibility: 'ALWAYS',
            createdAt: new Date(),
            updatedAt: new Date()
        }

        return NextResponse.json(config)

    } catch (error: any) {
        console.error('Error fetching business config:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ franchisorId: string }> }
) {
    const { franchisorId } = await params

    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can update franchisors' configs
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only Provider can configure business settings' }, { status: 403 })
        }

        // Verify franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        const body = await req.json()

        // Extract only valid config fields (exclude id, franchisorId, timestamps)
        const {
            usesCommissions, usesInventory, usesAppointments, usesScheduling,
            usesLoyalty, usesGiftCards, usesMemberships, usesReferrals,
            usesTipping, usesDiscounts, usesRetailProducts, usesServices,
            usesEmailMarketing, usesSMSMarketing, usesReviewManagement,
            usesMultiLocation, usesTimeTracking, usesPayroll,
            cashDiscountEnabled, cashDiscountPercent,
            reviewRequestTiming, commissionCalculation, commissionVisibility
        } = body

        const configData = {
            usesCommissions, usesInventory, usesAppointments, usesScheduling,
            usesLoyalty, usesGiftCards, usesMemberships, usesReferrals,
            usesTipping, usesDiscounts, usesRetailProducts, usesServices,
            usesEmailMarketing, usesSMSMarketing, usesReviewManagement,
            usesMultiLocation, usesTimeTracking, usesPayroll,
            cashDiscountEnabled, cashDiscountPercent,
            reviewRequestTiming, commissionCalculation, commissionVisibility
        }

        // Upsert config (create if doesn't exist, update if exists)
        const config = await prisma.businessConfig.upsert({
            where: { franchisorId },
            create: {
                franchisorId,
                ...configData
            },
            update: configData
        })

        return NextResponse.json({ success: true, config })

    } catch (error) {
        console.error('Error updating business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
