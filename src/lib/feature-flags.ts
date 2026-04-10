/**
 * Feature Flag Resolution System
 *
 * Resolution order (most specific wins):
 * Station → Location → FranchiseeBusiness → Franchisor → Vertical Default → Global Default
 *
 * PERFORMANCE (P0):
 * Results are cached in Redis per context. DB queries only fire on cache miss.
 * Before this fix: 3 DB queries per bootstrap cache miss (findMany + 2 findFirst).
 * After: 1 DB query on miss, cached for 1 hour. ~30K queries/min eliminated at 50K scale.
 */

import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDeletePattern } from '@/lib/cache'

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

// Cache TTL: 1 hour. Flags rarely change.
// Invalidated explicitly via invalidateFeatureFlagCache() on flag/override mutations.
const FLAG_CACHE_TTL = 3600

/**
 * Build a deterministic cache key from the flag context.
 * Two devices at the same location with the same businessType share the same flag result.
 */
function buildFlagCacheKey(context: FlagContext): string {
    const parts = [
        'flags',
        context.businessType || '_',
        context.franchisorId || '_',
        context.franchiseId || '_',
        context.locationId || '_',
        context.stationId || '_',
    ]
    return parts.join(':')
}

/**
 * Compute all feature flags for a given context.
 * Results are cached in Redis for FLAG_CACHE_TTL seconds.
 * DB queries only fire on cache miss.
 */
export async function computeFeatureFlags(context: FlagContext): Promise<FeatureFlagsResponse> {
    const cacheKey = buildFlagCacheKey(context)

    // ── Redis cache check ──
    const cached = await cacheGet<FeatureFlagsResponse>(cacheKey)
    if (cached) return cached

    // ── Cache miss: compute from DB ──
    // Single query: fetch all active flags with relevant overrides.
    // Previously also called getFeatureFlagVersion() which fired 2 additional findFirst queries.
    // Version is now derived from current timestamp — stable for TTL duration.
    const flags = await prisma.featureFlag.findMany({
        where: { status: 'ACTIVE' },
        include: {
            overrides: {
                where: {
                    OR: [
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

    // Version: current timestamp. Clients compare across bootstraps to detect changes.
    // Previously this fired 2 extra DB queries to find latest updatedAt — eliminated.
    const version = Math.floor(Date.now() / 1000)

    const result: FeatureFlagsResponse = {
        featureFlags: computedFlags,
        featureFlagsMeta: {
            version,
            fetchedAt: new Date().toISOString(),
            ttlSeconds: FLAG_CACHE_TTL
        }
    }

    // ── Cache the result (fire-and-forget) ──
    cacheSet(cacheKey, result, FLAG_CACHE_TTL).catch(() => {})

    return result
}

/**
 * Check a single flag for a context.
 * Uses the same cached result as computeFeatureFlags — no extra DB queries.
 *
 * WARNING: Previously (before P0 fix) this function fired 3 DB queries per call
 * because computeFeatureFlags had no caching. Now it reads from Redis on hit.
 * Still: prefer reading from bootstrap context rather than calling this in hot paths.
 */
export async function isFeatureEnabled(
    key: string,
    context: FlagContext
): Promise<boolean> {
    const flags = await computeFeatureFlags(context)
    return flags.featureFlags[key] === true
}

/**
 * Invalidate all cached flag results across all contexts.
 * Call this when a FeatureFlag or FeatureFlagOverride is created/updated/deleted.
 *
 * Uses pattern delete: flags:* — clears all flag cache keys.
 * Cost: one Redis KEYS + DEL operation. Safe because flag mutations are rare (admin-only).
 */
export async function invalidateFeatureFlagCache(): Promise<void> {
    try {
        await cacheDeletePattern('flags:*')
    } catch {
        // Non-critical — flags will refresh on TTL expiry (1 hour max staleness)
    }
}
