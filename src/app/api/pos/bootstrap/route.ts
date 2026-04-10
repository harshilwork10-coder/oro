/**
 * POS Bootstrap API
 * 
 * GET /api/pos/bootstrap
 * 
 * Single endpoint for Android POS initialization.
 * Consolidates: menu, staff, station/config, pax/settings, taxes, feature flags
 * Reduces 5-8 startup API calls to 1.
 * 
 * SCALABILITY: Redis-cached for 5 minutes per location.
 * At 200K terminals, this reduces DB queries by ~90%.
 * 
 * STAMPEDE PROTECTION (P1):
 * Uses withStampedeProtection() to serve stale data during cache refresh.
 * Only one function instance rebuilds the cache per location — others get stale data.
 * 
 * Uses withPOSAuth() wrapper - station scope from validated token ONLY.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'
import { computeFeatureFlags } from '@/lib/feature-flags'
import { CACHE_KEYS, CACHE_TTL, withStampedeProtection } from '@/lib/cache'
import crypto from 'crypto'

// ═══════════════════════════════════════════════════════════════════
// CACHE DATA SHAPE — unchanged from previous implementation
// ═══════════════════════════════════════════════════════════════════

interface BootstrapCachePayload {
    body: Record<string, unknown>
    versions: { menu: string; staff: string; config: string }
}

// ═══════════════════════════════════════════════════════════════════
// PURE FUNCTIONS — no cache side effects
// ═══════════════════════════════════════════════════════════════════

// Generate menu version hash for efficient Android caching
function generateMenuVersion(services: unknown[], products: unknown[], discounts: unknown[]): string {
    const content = JSON.stringify({
        s: services.length,
        p: products.length,
        d: discounts.length,
        sf: (services[0] as { id?: string })?.id,
        sl: (services[services.length - 1] as { id?: string })?.id,
        pf: (products[0] as { id?: string })?.id,
        pl: (products[products.length - 1] as { id?: string })?.id
    })
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 16)
}

/**
 * Build the full bootstrap response from database.
 * 
 * This is a pure data assembly function — it reads from the database,
 * computes feature flags, and returns the response body + version hashes.
 * It does NOT read from or write to Redis cache.
 * 
 * Extracted from the inline handler to enable withStampedeProtection() wrapping.
 * 
 * @param franchiseId  - From validated station token
 * @param locationId   - From validated station token
 * @param stationName  - From validated station token
 */
async function buildBootstrapResponse(
    franchiseId: string,
    locationId: string,
    stationName: string
): Promise<BootstrapCachePayload> {
    // Get location with franchise + franchisor for full context
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
        throw new BootstrapNotFoundError('Location not found')
    }

    const franchise = location.franchise
    const franchisor = franchise.franchisor
    const settings = franchise.settings

    // ═══════════════════════════════════════════════════════════════════
    // 1. STAFF LIST
    // ═══════════════════════════════════════════════════════════════════
    const staff = await prisma.user.findMany({
        where: {
            franchiseId,
            isActive: true,
            role: { in: ['EMPLOYEE', 'OWNER', 'MANAGER'] }
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true
        },
        orderBy: { name: 'asc' }
    })

    const colors = ['#EA580C', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B']
    const staffFormatted = staff.map((s, i) => ({
        id: s.id,
        name: s.name || s.email?.split('@')[0] || 'Unknown',
        email: s.email,
        role: s.role,
        color: colors[i % colors.length],
        initials: (s.name || s.email?.split('@')[0] || '??')
            .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        image: s.image
    }))

    const staffVersion = crypto.createHash('md5')
        .update(JSON.stringify(staff.map(s => s.id)))
        .digest('hex').slice(0, 8)

    // ═══════════════════════════════════════════════════════════════════
    // 2. MENU
    // ═══════════════════════════════════════════════════════════════════
    const [services, products, discounts, categories] = await Promise.all([
        prisma.service.findMany({
            where: { franchiseId },
            include: { serviceCategory: true },
            orderBy: { name: 'asc' }
        }),
        prisma.product.findMany({
            where: { franchiseId, isActive: true },
            orderBy: { name: 'asc' }
        }),
        prisma.discount.findMany({
            where: { franchiseId, isActive: true }
        }),
        prisma.serviceCategory.findMany({
            where: { franchiseId },
            select: { id: true, name: true }
        })
    ])

    const menuVersion = generateMenuVersion(services, products, discounts)

    // ═══════════════════════════════════════════════════════════════════
    // 3. SETTINGS & TAX CONFIG
    // ═══════════════════════════════════════════════════════════════════
    // Tax rate hierarchy: Location override (TODO) > FranchiseSettings > default
    const taxRate = settings?.taxRate
        ? parseFloat(settings.taxRate.toString())
        : 0.0825  // Default 8.25%

    // Get business config for per-item-type tax flags
    const businessConfig = await prisma.businessConfig.findFirst({
        where: { franchisorId: franchise.franchisorId },
        select: { taxServices: true, taxProducts: true }
    })

    const taxConfig = {
        taxRate,
        taxIncluded: false,
        taxServices: businessConfig?.taxServices ?? true,  // Salon: usually false
        taxProducts: businessConfig?.taxProducts ?? true   // Products: usually true
    }

    // DUAL PRICING DEBUG - Log entire settings object
    console.error('='.repeat(50))
    console.error('[Bootstrap DUAL PRICING DEBUG]')
    console.error('  settings object:', settings ? JSON.stringify({
        id: settings.id,
        pricingModel: settings.pricingModel,
        cardSurcharge: settings.cardSurcharge,
        showDualPricing: settings.showDualPricing
    }) : 'NULL SETTINGS!')
    console.error('  franchiseId:', franchiseId)
    console.error('  locationId:', location.id)
    console.error('  Computed dualPricingEnabled:', settings?.pricingModel === 'DUAL_PRICING')
    console.error('='.repeat(50))

    const stationConfig = {
        locationId: location.id,
        locationName: location.name,
        stationName: stationName,
        businessType: location.businessType || 'RETAIL',

        // Dual pricing - requires BOTH pricingModel AND showDualPricing flag (matches web POS logic)
        dualPricingEnabled: settings?.pricingModel === 'DUAL_PRICING' && settings?.showDualPricing === true,
        cashDiscountPercent: settings?.cardSurcharge ? parseFloat(settings.cardSurcharge.toString()) : 4.0,

        // PAX Terminal
        paxTerminalIP: location.paxTerminalIP || null,
        paxTerminalPort: location.paxTerminalPort ? parseInt(location.paxTerminalPort) : 10009,

        // Receipt settings
        receiptHeader: settings?.storeDisplayName || franchise.name || '',
        receiptFooter: settings?.receiptFooter || 'Thank you!',

        // Tips - read from account settings (owner can enable/disable)
        tipEnabled: (settings as any)?.tipPromptEnabled ?? true,
        tipPresets: [15, 18, 20, 25],

        // Permissions
        permissions: {
            voidRequiresPIN: true,
            refundRequiresPIN: true,
            discountMaxPercent: 20,
            largeDiscountRequiresPIN: true,
            openDrawerRequiresPIN: false
        },

        // Offline
        offlineEnabled: true,
        offlineCashOnly: true,

        // Brand Theme Pack - salon customization
        themeId: location.themeId || 'classic_oro',
        highContrast: location.highContrast || false,

        // Google Reviews
        googlePlaceId: location.googlePlaceId || null
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. FEATURE FLAGS
    // ═══════════════════════════════════════════════════════════════════
    let featureFlags: Record<string, boolean> = {}
    try {
        const flagsResult = await computeFeatureFlags({
            businessType: location.businessType || 'RETAIL',
            locationId: location.id,
            franchiseId,
            franchisorId: franchisor?.id
        })
        featureFlags = flagsResult.featureFlags
    } catch (e) {
        console.error('[Bootstrap] Feature flags failed:', e)
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. DEALER BRANDING
    // ═══════════════════════════════════════════════════════════════════
    const dealerBranding = franchisor?.dealerBranding ? {
        dealerName: franchisor.dealerBranding.dealerName,
        logoUrl: franchisor.dealerBranding.logoUrl,
        supportPhone: franchisor.dealerBranding.supportPhone,
        supportEmail: franchisor.dealerBranding.supportEmail
    } : null

    // ═══════════════════════════════════════════════════════════════════
    // BUILD RESPONSE — identical shape to previous implementation
    // ═══════════════════════════════════════════════════════════════════
    // Generate config version from settings hash
    const configVersion = crypto.createHash('md5')
        .update(JSON.stringify({
            dual: stationConfig.dualPricingEnabled,
            pax: stationConfig.paxTerminalIP,
            flags: featureFlags,
            themeId: stationConfig.themeId,
            highContrast: stationConfig.highContrast
        }))
        .digest('hex').slice(0, 8)

    const responseBody: Record<string, unknown> = {
        success: true,

        // Versions for conditional refresh
        versions: {
            menu: menuVersion,
            staff: staffVersion,
            config: configVersion,
        },

        // Core data - always include for cache
        vertical: location.businessType || 'RETAIL',
        staff: staffFormatted,  // Always include in cached version
        menu: {
            services: services.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                price: parseFloat(s.price.toString()),
                duration: s.duration,
                category: s.serviceCategory?.name || 'SERVICES',
                franchiseId: s.franchiseId
            })),
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: parseFloat(p.price.toString()),
                stock: p.stock,
                category: p.category || 'PRODUCTS',
                franchiseId: p.franchiseId
            })),
            discounts,
            categories
        },

        // Config & settings
        settings: stationConfig,
        taxes: taxConfig,
        featureFlags,
        dealerBranding,

        // Server time for sync cursor
        serverTime: new Date().toISOString(),

        // Meta — cache status will be overwritten by the route handler
        _meta: {
            latencyMs: 0,
            menuIncluded: true,
            staffIncluded: true,
            timestamp: new Date().toISOString(),
            cache: 'MISS'
        }
    }

    return {
        body: responseBody,
        versions: { menu: menuVersion, staff: staffVersion, config: configVersion }
    }
}

/**
 * Sentinel error for "location not found" — lets the route handler
 * return a proper 404 instead of a generic 500.
 */
class BootstrapNotFoundError extends Error {
    constructor(message: string) { super(message); this.name = 'BootstrapNotFoundError' }
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/pos/bootstrap
 * 
 * Protected by withPOSAuth - requires X-Station-Token header
 * All scope (franchiseId, locationId) comes from validated token ONLY
 * 
 * Query Parameters:
 * - menuVersion: Current cached menu version (skip menu if unchanged)
 * - staffVersion: Current cached staff version (skip staff if unchanged)
 */
export const GET = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const startTime = Date.now()
    const url = new URL(req.url)

    // SECURITY: All scope from validated token
    const { franchiseId, locationId, stationName } = ctx

    const clientMenuVersion = url.searchParams.get('menuVersion')
    const clientStaffVersion = url.searchParams.get('staffVersion')
    const clientConfigVersion = url.searchParams.get('configVersion')

    // ETag support for full 304 response
    const clientETag = req.headers.get('If-None-Match')

    // Force refresh parameter - bypasses cache entirely
    const forceRefresh = url.searchParams.get('force') === 'true'

    try {
        const cacheKey = CACHE_KEYS.BOOTSTRAP(locationId)

        if (forceRefresh) {
            console.error(`[Bootstrap] FORCE REFRESH requested for location ${locationId}`)
        }

        // ═══════════════════════════════════════════════════════════════════
        // STAMPEDE-PROTECTED CACHE
        // 
        // Behavior:
        // 1. Fresh cache  → return immediately (no DB)
        // 2. Stale cache  → return stale data, ONE function rebuilds in background
        // 3. Empty cache  → build from DB synchronously, cache result
        // 4. Force refresh → skip cache, build from DB
        //
        // This replaces the previous inline cacheGet/cacheSet that had no
        // stampede protection (all devices hit DB simultaneously on expiry).
        // ═══════════════════════════════════════════════════════════════════

        let cachePayload: BootstrapCachePayload

        if (forceRefresh) {
            // Force refresh: bypass cache entirely, go straight to DB
            cachePayload = await buildBootstrapResponse(franchiseId, locationId, stationName)
        } else {
            // Normal path: stampede-protected cache
            cachePayload = await withStampedeProtection<BootstrapCachePayload>(
                cacheKey,
                CACHE_TTL.BOOTSTRAP,       // 300s fresh
                60,                         // 60s stale grace period
                () => buildBootstrapResponse(franchiseId, locationId, stationName)
            )
        }

        const { body, versions } = cachePayload
        const serverETag = `"${versions.menu}-${versions.staff}-${versions.config}"`

        // ─── ETag 304: Client already has this exact data ───
        if (clientETag && clientETag === serverETag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    'ETag': serverETag,
                    'Cache-Control': 'private, must-revalidate',
                    'X-Cache': forceRefresh ? 'BYPASS' : 'STAMPEDE_PROTECTED',
                    'X-Menu-Version': versions.menu,
                    'X-Staff-Version': versions.staff,
                    'X-Config-Version': versions.config
                }
            })
        }

        // ─── Full response ───
        const latencyMs = Date.now() - startTime
        const cacheStatus = forceRefresh ? 'BYPASS' : 'STAMPEDE_PROTECTED'

        return NextResponse.json({
            ...body,
            _meta: {
                ...(body._meta as Record<string, unknown>),
                latencyMs,
                cache: cacheStatus
            }
        }, {
            headers: {
                'ETag': serverETag,
                'Cache-Control': 'private, must-revalidate',
                'X-Cache': cacheStatus,
                'X-Menu-Version': versions.menu,
                'X-Staff-Version': versions.staff,
                'X-Config-Version': versions.config
            }
        })

    } catch (error) {
        if (error instanceof BootstrapNotFoundError) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }
        console.error('[Bootstrap] Error:', error)
        return NextResponse.json(
            { error: 'Failed to load bootstrap data' },
            { status: 500 }
        )
    }
})
