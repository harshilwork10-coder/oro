import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { invalidateLocationCache } from '@/lib/cache'
import { logActivity } from '@/lib/auditLog'

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.email || authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider access required' }, { status: 401 })
        }

        const body = await req.json()
        const {
            franchiseId,
            pricingModel,
            cardSurchargeType,
            cardSurcharge,
            showDualPricing,
            taxRate
        } = body

        if (!franchiseId) {
            return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 })
        }

        // Verify franchise exists
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId },
            update: {
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING'),
                ...(taxRate !== undefined && { taxRate })
            },
            create: {
                franchiseId,
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING'),
                ...(taxRate !== undefined && { taxRate })
            }
        })

        // CRITICAL: Invalidate cache for all locations so Android gets updated pricing settings immediately after provisioning
        const franchiseLocations = await prisma.location.findMany({
            where: { franchiseId },
            select: { id: true }
        })
        for (const loc of franchiseLocations) {
            await invalidateLocationCache(loc.id)
        }

        // Audit log
        await logActivity({
            userId: authUser.id,
            userEmail: authUser.email,
            userRole: 'PROVIDER',
            action: 'PROVIDER_FRANCHISE_SETTINGS_CONFIGURED',
            entityType: 'FranchiseSettings',
            entityId: franchiseId,
            metadata: { pricingModel, cardSurchargeType, cardSurcharge, taxRate }
        })

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error updating franchise settings by Provider:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.email || authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider access required' }, { status: 401 })
        }

        const url = new URL(req.url)
        const franchiseId = url.searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 })
        }

        const settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId }
        })

        return NextResponse.json(settings || {})
    } catch (error) {
        console.error('Error fetching franchise settings by Provider:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
