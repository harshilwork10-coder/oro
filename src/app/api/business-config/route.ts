import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { invalidateLocationCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with all possible relationships to find config
        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            include: {
                // Direct franchisor ownership (for owners)
                franchisor: {
                    select: {
                        id: true,
                        industryType: true,
                        config: true
                    }
                },
                // Franchise relationship (for employees/managers)
                franchise: {
                    include: {
                        franchisor: {
                            select: {
                                id: true,
                                industryType: true,
                                config: true
                            }
                        },
                        settings: true // ← Fetch FranchiseSettings for live runtime fields
                    }
                }
            }
        })

        // Try to find config: first check direct franchisor, then via franchise
        const franchisorConfig = user?.franchisor?.config
        const franchiseConfig = user?.franchise?.franchisor?.config
        const targetConfig = franchisorConfig || franchiseConfig

        // ════════════════════════════════════════════════════════════════════
        // LIVE RUNTIME SOURCE: FranchiseSettings
        // For pricing/tax/tip fields, FranchiseSettings is the live source
        // of truth. BusinessConfig values are PROVIDER DEFAULTS only.
        //
        // Reconciliation: if FranchiseSettings field is null/missing,
        // fall back to BusinessConfig value (provider default).
        // ════════════════════════════════════════════════════════════════════
        const liveSettings = user?.franchise?.settings

        if (!targetConfig && !user?.franchisor && !user?.franchise?.franchisor) {
            // Return default config for users without a franchisor/franchise
            return NextResponse.json({
                taxRate: 0.08,
                usesInventory: true,
                usesServices: true,
                usesRetailProducts: true,
                usesAppointments: true,
                usesTipping: true,
            })
        }

        // Determine posMode from franchisor's industryType (RETAIL → 'RETAIL', SERVICE → 'SALON')
        const franchisor = user?.franchisor || user?.franchise?.franchisor
        const industryType = franchisor?.industryType || 'SERVICE'
        const derivedPosMode = industryType === 'RETAIL' ? 'RETAIL' :
            industryType === 'RESTAURANT' ? 'RESTAURANT' : 'SALON'

        // Return existing config or default values with derived posMode
        const config = targetConfig || {
            id: null,
            franchisorId: user?.franchisor?.id || user?.franchise?.franchisorId,
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
            posMode: derivedPosMode, // Derived from industryType, not hardcoded
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

        // ════════════════════════════════════════════════════════════════════
        // OVERLAY: Live runtime pricing/tax/tip from FranchiseSettings
        // Reconciliation: FranchiseSettings value wins if populated,
        //                 otherwise fall back to BusinessConfig (provider default).
        // ════════════════════════════════════════════════════════════════════
        const liveOverlay: Record<string, unknown> = {}

        if (liveSettings) {
            // Pricing — FranchiseSettings is live source
            if (liveSettings.pricingModel != null) {
                liveOverlay.pricingModel = liveSettings.pricingModel
                liveOverlay.dualPricingEnabled = liveSettings.pricingModel === 'DUAL_PRICING' && liveSettings.showDualPricing === true
            }
            if (liveSettings.cardSurcharge != null) {
                liveOverlay.cardSurcharge = parseFloat(liveSettings.cardSurcharge.toString())
                liveOverlay.dualPricingAmount = parseFloat(liveSettings.cardSurcharge.toString())
            }
            if (liveSettings.cardSurchargeType != null) {
                liveOverlay.cardSurchargeType = liveSettings.cardSurchargeType
                liveOverlay.dualPricingType = liveSettings.cardSurchargeType === 'PERCENTAGE' ? 'PERCENT' : 'FIXED'
            }
            if (liveSettings.showDualPricing != null) {
                liveOverlay.showDualPricing = liveSettings.showDualPricing
            }

            // Tax — FranchiseSettings is live source
            if (liveSettings.taxRate != null) {
                liveOverlay.taxRate = parseFloat(liveSettings.taxRate.toString())
            }

            // Tip — read from FranchiseSettings if the fields exist on it
            // (tip fields may not be on FranchiseSettings yet; if not, BusinessConfig value is kept)

            // Payment options — read from FranchiseSettings if present
            // (these may still be on BusinessConfig in the current schema)

            // Receipt settings
            if (liveSettings.receiptPrintMode != null) liveOverlay.receiptPrintMode = liveSettings.receiptPrintMode
            if (liveSettings.openDrawerOnCash != null) liveOverlay.openDrawerOnCash = liveSettings.openDrawerOnCash

            // Operational controls from FranchiseSettings (where they also exist)
            if (liveSettings.requireManagerPinAbove != null) {
                liveOverlay.requireManagerPinAbove = parseFloat(liveSettings.requireManagerPinAbove.toString())
            }
            if (liveSettings.refundLimitPerDay != null) {
                liveOverlay.refundLimitPerDay = parseFloat(liveSettings.refundLimitPerDay.toString())
            }

            // Discount limits
            if (liveSettings.maxDiscountPercent != null) {
                liveOverlay.discountMaxPercent = parseFloat(liveSettings.maxDiscountPercent.toString())
            }
        }

        return NextResponse.json({
            ...config,
            posMode: derivedPosMode, // Always derive, never trust stored value
            ...liveOverlay // FranchiseSettings fields override BusinessConfig
        })

    } catch (error) {
        console.error('Error fetching business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER role can update business config
        if (authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only Provider can configure business settings' }, { status: 403 })
        }

        const body = await req.json()

        // Get user's franchisor record
        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
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

        // CRITICAL: Invalidate cache for ALL locations so Android gets updated settings IMMEDIATELY
        const allFranchises = await prisma.franchise.findMany({
            where: { franchisorId: user.franchisor.id },
            include: { locations: { select: { id: true } } }
        })
        const allLocationIds = allFranchises.flatMap(f => f.locations.map(l => l.id))
        if (allLocationIds.length > 0) {
            console.error(`[BusinessConfig] Settings update - invalidating ${allLocationIds.length} location caches`)
            for (const locId of allLocationIds) {
                await invalidateLocationCache(locId)
            }
        }

        return NextResponse.json({ success: true, config })

    } catch (error) {
        console.error('Error updating business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
