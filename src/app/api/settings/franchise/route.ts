import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { invalidateLocationCache } from '@/lib/cache'
import { logActivity } from '@/lib/auditLog'

// GET: Fetch franchise settings
export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(request)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: user.email },
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
export async function POST(request: Request) {
    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const body = await request.json()
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

        // Also update tip and payment settings in BusinessConfig if user's franchisor has one
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { franchisor: true }
        })


        if (franchise?.franchisorId) {
            await prisma.businessConfig.upsert({
                where: { franchisorId: franchise.franchisorId },
                update: {
                    tipPromptEnabled: tipPromptEnabled ?? true,
                    tipType: tipType || 'PERCENT',
                    tipSuggestions: tipSuggestions || '[15,20,25]',
                    acceptsEbt: acceptsEbt ?? false,
                    acceptsChecks: acceptsChecks ?? false,
                    acceptsOnAccount: acceptsOnAccount ?? false,
                    // Sync tax rate to BusinessConfig so useBusinessConfig() stays consistent
                    ...(taxRate !== undefined && { taxRate })
                },
                create: {
                    franchisorId: franchise.franchisorId,
                    tipPromptEnabled: tipPromptEnabled ?? true,
                    tipType: tipType || 'PERCENT',
                    tipSuggestions: tipSuggestions || '[15,20,25]',
                    acceptsEbt: acceptsEbt ?? false,
                    acceptsChecks: acceptsChecks ?? false,
                    acceptsOnAccount: acceptsOnAccount ?? false,
                    ...(taxRate !== undefined && { taxRate })
                }
            })
        }

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

