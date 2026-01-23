/**
 * Feature Flag Resolution System
 * 
 * Resolution order (most specific wins):
 * Station → Location → FranchiseeBusiness → Franchisor → Vertical Default → Global Default
 */

import { prisma } from '@/lib/prisma'

interface FlagContext {
    businessType: string // SALON, RETAIL, RESTAURANT
    stationId?: string
    locationId?: string
    franchiseId?: string  // FranchiseeBusiness (LLC)
    franchisorId?: string
}

interface ComputedFlags {
    [key: string]: boolean
}

interface FeatureFlagsResponse {
    featureFlags: ComputedFlags
    featureFlagsMeta: {
        version: number
        fetchedAt: string
        ttlSeconds: number
    }
}

/**
 * Compute all feature flags for a given context
 * Uses single query with all overrides, then resolves in memory
 */
export async function computeFeatureFlags(context: FlagContext): Promise<FeatureFlagsResponse> {
    // Fetch all active flags with their overrides
    const flags = await prisma.featureFlag.findMany({
        where: { status: 'ACTIVE' },
        include: {
            overrides: {
                where: {
                    OR: [
                        // Get all potentially relevant overrides
                        context.stationId ? { scopeType: 'STATION', scopeId: context.stationId } : {},
                        context.locationId ? { scopeType: 'LOCATION', scopeId: context.locationId } : {},
                        context.franchiseId ? { scopeType: 'FRANCHISEE_BUSINESS', scopeId: context.franchiseId } : {},
                        context.franchisorId ? { scopeType: 'FRANCHISOR', scopeId: context.franchisorId } : {},
                    ].filter(o => Object.keys(o).length > 0)
                }
            }
        }
    })

    const computedFlags: ComputedFlags = {}

    // Resolution priority (higher index = higher priority)
    const scopePriority: Record<string, number> = {
        'FRANCHISOR': 1,
        'FRANCHISEE_BUSINESS': 2,
        'LOCATION': 3,
        'STATION': 4
    }

    for (const flag of flags) {
        // Check vertical targeting
        if (flag.targetVerticals) {
            const verticals = flag.targetVerticals as string[]
            if (!verticals.includes(context.businessType)) {
                // Flag not targeted at this vertical - skip (don't include in response)
                continue
            }
        }

        // Start with default value
        let resolvedValue = flag.defaultValue

        // Find the highest priority override
        let highestPriority = 0

        for (const override of flag.overrides) {
            const priority = scopePriority[override.scopeType] || 0
            if (priority > highestPriority) {
                highestPriority = priority
                resolvedValue = override.value
            }
        }

        computedFlags[flag.key] = resolvedValue
    }

    // Compute version hash from flags + overrides for cache invalidation
    const version = await getFeatureFlagVersion()

    return {
        featureFlags: computedFlags,
        featureFlagsMeta: {
            version,
            fetchedAt: new Date().toISOString(),
            ttlSeconds: 3600 // 1 hour cache
        }
    }
}

/**
 * Get a version number based on latest flag/override update
 * Used by clients to know when to refresh
 */
async function getFeatureFlagVersion(): Promise<number> {
    const latestFlag = await prisma.featureFlag.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
    })

    const latestOverride = await prisma.featureFlagOverride.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
    })

    const latestDate = [latestFlag?.updatedAt, latestOverride?.updatedAt]
        .filter(Boolean)
        .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0]

    // Return unix timestamp as version
    return latestDate ? Math.floor(latestDate.getTime() / 1000) : 0
}

/**
 * Check a single flag for a context (useful for server-side checks)
 */
export async function isFeatureEnabled(
    key: string,
    context: FlagContext
): Promise<boolean> {
    const flags = await computeFeatureFlags(context)
    return flags.featureFlags[key] === true
}
