/**
 * POS Station Config API
 * 
 * GET /api/pos/station/config
 * 
 * Returns station configuration for Android POS.
 * Uses withPOSAuth() wrapper - station scope from validated token ONLY.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'
import { computeFeatureFlags } from '@/lib/feature-flags'

/**
 * GET /api/pos/station/config
 * 
 * Protected by withPOSAuth - requires X-Station-Token header
 * All scope comes from validated token, NEVER from client
 */
export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    // SECURITY: All scope from validated token
    const { locationId, stationName, franchiseId } = ctx

    try {
        // Get location with franchise + franchisor for dealer branding
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
                franchise: {
                    include: {
                        franchisor: {
                            include: {
                                dealerBranding: true
                            }
                        },
                        settings: true
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        const franchise = location.franchise
        const settings = franchise?.settings as any

        // Build config response — ALL values from DB, with safe defaults
        const config = {
            // Location info (from validated token)
            locationId: location.id,
            locationName: location.name,
            stationName: stationName,
            businessType: location.businessType || 'RETAIL',

            // Tax settings — from BusinessConfig
            taxRate: settings?.taxRate ? parseFloat(settings.taxRate.toString()) : 0.0825,
            taxIncluded: settings?.taxInclusive ?? false,

            // Dual pricing — from BusinessConfig (matches bootstrap logic)
            dualPricingEnabled: settings?.pricingModel === 'DUAL_PRICING' && settings?.showDualPricing === true,
            cashDiscountPercent: settings?.cardSurcharge ? parseFloat(settings.cardSurcharge.toString()) : 4.0,

            // PAX Terminal (from Location table)
            paxTerminalIP: location.paxTerminalIP || null,
            paxTerminalPort: location.paxTerminalPort ? parseInt(location.paxTerminalPort) : 10009,

            // Receipt settings — from BusinessConfig
            receiptHeader: settings?.storeDisplayName || franchise?.name || '',
            receiptFooter: settings?.receiptFooter || 'Thank you for your business!',
            receiptShowLogo: true,
            receiptLogoUrl: null,

            // Tip settings — from account settings (owner can enable/disable)
            tipEnabled: settings?.tipPromptEnabled ?? true,
            tipPresets: [15, 18, 20, 25],

            // Permissions
            permissions: {
                voidRequiresPIN: true,
                refundRequiresPIN: true,
                discountMaxPercent: 20,
                largeDiscountRequiresPIN: true,
                openDrawerRequiresPIN: false,
            },

            // Loyalty — from BusinessConfig
            loyaltyEnabled: settings?.usesLoyalty ?? false,
            pointsPerDollar: 1,
            pointValue: 0.01,

            // Offline settings
            offlineEnabled: true,
            offlineCashOnly: true,
        }

        // Feature Flags
        let featureFlagsData = {
            featureFlags: {} as Record<string, boolean>,
            featureFlagsMeta: { version: 0, fetchedAt: new Date().toISOString(), ttlSeconds: 3600 }
        }

        try {
            featureFlagsData = await computeFeatureFlags({
                businessType: location.businessType || 'RETAIL',
                locationId: location.id,
                franchiseId: franchiseId,
                franchisorId: franchise?.franchisorId,
            })
        } catch (flagError) {
            console.error('[StationConfig] Feature flag resolution failed:', flagError)
        }

        // Dealer Co-Branding
        const franchisor = franchise?.franchisor as {
            dealerBranding?: {
                dealerName: string
                logoUrl: string | null
                supportPhone: string | null
                supportEmail: string | null
            }
        } | null

        const dealerBranding = franchisor?.dealerBranding ? {
            dealerName: franchisor.dealerBranding.dealerName,
            logoUrl: franchisor.dealerBranding.logoUrl,
            supportPhone: franchisor.dealerBranding.supportPhone,
            supportEmail: franchisor.dealerBranding.supportEmail
        } : null

        return NextResponse.json({
            success: true,
            data: {
                ...config,
                ...featureFlagsData,
                dealerBranding
            }
        })

    } catch (error) {
        console.error('[StationConfig] Error:', error)
        return NextResponse.json({ error: 'Failed to load station config' }, { status: 500 })
    }
})

// Note: POST endpoint for pairing removed - use /api/pos/pair-terminal instead
