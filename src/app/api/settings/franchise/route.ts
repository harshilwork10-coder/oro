import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { invalidateLocationCache } from '@/lib/cache'
import { logActivity } from '@/lib/auditLog'
import { enforceBrandLocks } from '@/lib/settings/brandLocks'

// GET: Fetch franchise settings
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        // Get franchise with franchisor
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { franchisor: true }
        })

        // Get or create settings
        let settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) {
            // Create default settings with STANDARD pricing
            settings = await prisma.franchiseSettings.create({
                data: {
                    franchiseId: user.franchiseId,
                    pricingModel: 'STANDARD',
                    cardSurchargeType: 'PERCENTAGE',
                    cardSurcharge: 3.99,
                    showDualPricing: false
                }
            })
        }

        // Get tip and payment settings from BusinessConfig
        let configSettings = null
        if (franchise?.franchisorId) {
            configSettings = await prisma.businessConfig.findUnique({
                where: { franchisorId: franchise.franchisorId },
                select: {
                    tipPromptEnabled: true,
                    tipType: true,
                    tipSuggestions: true,
                    acceptsEbt: true,
                    acceptsChecks: true,
                    acceptsOnAccount: true
                }
            })
        }

        // Merge settings
        return NextResponse.json({
            ...settings,
            tipPromptEnabled: configSettings?.tipPromptEnabled ?? true,
            tipType: configSettings?.tipType ?? 'PERCENT',
            tipSuggestions: configSettings?.tipSuggestions ?? '[15,20,25]',
            acceptsEbt: configSettings?.acceptsEbt ?? false,
            acceptsChecks: configSettings?.acceptsChecks ?? false,
            acceptsOnAccount: configSettings?.acceptsOnAccount ?? false
        })
    } catch (error) {
        console.error('Error fetching franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST: Update franchise settings
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const body = await req.json()
        const {
            pricingModel,
            cardSurchargeType,
            cardSurcharge,
            showDualPricing,
            taxRate,
            tipPromptEnabled,
            tipType,
            tipSuggestions,
            acceptsEbt,
            acceptsChecks,
            acceptsOnAccount
        } = body

        // ════════════════════════════════════════════════════════════════════
        // BRAND LOCK ENFORCEMENT
        // For BRAND_FRANCHISOR with active locks, reject writes to locked fields.
        // For MULTI_LOCATION_OWNER, this is a no-op pass-through.
        // ════════════════════════════════════════════════════════════════════
        const settingsFields = Object.keys(body).filter(k => body[k] !== undefined)
        const enforcement = await enforceBrandLocks(user.franchiseId, settingsFields)

        if (!enforcement.allowed) {
            return NextResponse.json({
                error: enforcement.message,
                blockedFields: enforcement.blockedFields,
                blockedByLock: enforcement.blockedByLock,
            }, { status: 403 })
        }

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: {
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING'),
                ...(taxRate !== undefined && { taxRate })
            },
            create: {
                franchiseId: user.franchiseId,
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING'),
                ...(taxRate !== undefined && { taxRate })
            }
        })

        // CRITICAL: Invalidate cache for all locations so Android gets updated pricing settings
        const franchiseLocations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        console.error(`[FranchiseSettings] Pricing update - invalidating ${franchiseLocations.length} location caches`)
        for (const loc of franchiseLocations) {
            await invalidateLocationCache(loc.id)
        }

        // ════════════════════════════════════════════════════════════════════
        // SOURCE OF TRUTH: FranchiseSettings is the LIVE runtime source.
        // BusinessConfig is provider-defaults/templates ONLY.
        //
        // REMOVED: prisma.businessConfig.upsert() dual-write.
        // Previously this POST handler wrote tip/payment/tax fields to BOTH
        // FranchiseSettings AND BusinessConfig, causing silent setting drift
        // when Provider later updated BusinessConfig independently.
        //
        // All live store pricing/tax/tip behavior now comes exclusively
        // from FranchiseSettings. BusinessConfig retains provider-set
        // feature toggles and subscription limits only.
        // ════════════════════════════════════════════════════════════════════

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'OWNER',
            action: 'FRANCHISE_SETTINGS_UPDATE',
            entityType: 'FranchiseSettings',
            entityId: user.franchiseId,
            metadata: { pricingModel, cardSurchargeType, cardSurcharge, taxRate, tipPromptEnabled }
        })

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error updating franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
