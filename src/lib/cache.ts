import { Redis } from '@upstash/redis'

/**
 * Redis Cache Utility for ORO 9 POS
 * 
 * Provides a centralized caching layer to handle 200K+ terminals.
 * Uses Upstash Redis (serverless, Vercel-compatible).
 * 
 * Cache Strategy:
 * - Menu/Catalog: 5 minute TTL (cached per location)
 * - Staff: 5 minute TTL (cached per location)
 * - Settings: 5 minute TTL (cached per location)
 * - Bootstrap: 5 minute TTL (cached per location, reduces 5 queries to 1)
 * 
 * Invalidation:
 * - On menu updates: invalidate location's menu cache
 * - On staff changes: invalidate location's staff cache
 * - On settings changes: invalidate location's settings cache
 */

// Initialize Redis client (lazy singleton)
let redis: Redis | null = null

export function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        // Gracefully degrade if Redis not configured
        console.error('[Cache] Redis not configured - caching disabled')
        return null
    }

    if (!redis) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
    }
    return redis
}

// Cache TTLs in seconds
export const CACHE_TTL = {
    MENU: 300,        // 5 minutes
    STAFF: 300,       // 5 minutes
    SETTINGS: 300,    // 5 minutes
    BOOTSTRAP: 300,   // 5 minutes
    SHORT: 60,        // 1 minute (for frequently changing data)
}

// Cache key prefixes
export const CACHE_KEYS = {
    MENU: (locationId: string) => `menu:${locationId}`,
    STAFF: (locationId: string) => `staff:${locationId}`,
    SETTINGS: (locationId: string) => `settings:${locationId}`,
    BOOTSTRAP: (locationId: string) => `bootstrap_v2:${locationId}`,
    EMPLOYEES_LOGIN: (locationId: string) => `employees_login:${locationId}`,
    BRAND: (brandCode: string) => `brand:${brandCode}`,
    BRAND_DOMAIN: (domain: string) => `brand-domain:${domain}`,
    QUEUE: (locationId: string) => `queue:${locationId}`,
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedis()
    if (!client) return null

    try {
        const cached = await client.get(key)
        if (cached) {
            console.error(`[Cache] HIT: ${key}`)
            return cached as T
        }
        console.error(`[Cache] MISS: ${key}`)
        return null
    } catch (error) {
        console.error(`[Cache] Error getting ${key}:`, error)
        return null
    }
}

/**
 * Set a cached value with TTL
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    const client = getRedis()
    if (!client) return false

    try {
        await client.set(key, JSON.stringify(value), { ex: ttlSeconds })
        console.error(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`)
        return true
    } catch (error) {
        console.error(`[Cache] Error setting ${key}:`, error)
        return false
    }
}

/**
 * Delete a cached value (for invalidation)
 */
export async function cacheDelete(key: string): Promise<boolean> {
    const client = getRedis()
    if (!client) return false

    try {
        await client.del(key)
        console.error(`[Cache] DELETE: ${key}`)
        return true
    } catch (error) {
        console.error(`[Cache] Error deleting ${key}:`, error)
        return false
    }
}

/**
 * Delete multiple cached values by pattern (for bulk invalidation)
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
    const client = getRedis()
    if (!client) return 0

    try {
        // Upstash doesn't support SCAN directly, use keys command for small datasets
        // For production at scale, consider using separate invalidation queues
        const keys = await client.keys(pattern)
        if (keys.length === 0) return 0

        await client.del(...keys)
        console.error(`[Cache] DELETE PATTERN: ${pattern} (${keys.length} keys)`)
        return keys.length
    } catch (error) {
        console.error(`[Cache] Error deleting pattern ${pattern}:`, error)
        return 0
    }
}

/**
 * Invalidate all caches for a location
 */
export async function invalidateLocationCache(locationId: string): Promise<void> {
    await Promise.all([
        cacheDelete(CACHE_KEYS.MENU(locationId)),
        cacheDelete(CACHE_KEYS.STAFF(locationId)),
        cacheDelete(CACHE_KEYS.SETTINGS(locationId)),
        cacheDelete(CACHE_KEYS.BOOTSTRAP(locationId)),
        cacheDelete(CACHE_KEYS.EMPLOYEES_LOGIN(locationId)),
        cacheDelete(CACHE_KEYS.QUEUE(locationId)),
        cacheDeletePattern(`flags:*:*:*:${locationId}:*`),
    ])
    console.error(`[Cache] Invalidated all caches for location: ${locationId}`)
}

/**
 * Cache wrapper for async functions (cache-aside pattern)
 * 
 * Usage:
 * const data = await withCache(
 *   CACHE_KEYS.MENU(locationId),
 *   CACHE_TTL.MENU,
 *   () => fetchMenuFromDatabase(locationId)
 * )
 */
export async function withCache<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    // Try cache first
    const cached = await cacheGet<T>(key)
    if (cached !== null) {
        return cached
    }

    // Cache miss - fetch data
    const data = await fetchFn()

    // Store in cache (don't await - fire and forget)
    cacheSet(key, data, ttlSeconds).catch(() => { })

    return data
}

// ════════════════════════════════════════════════════════════════
// Stampede-Protected Cache (P1 — bootstrap thundering herd fix)
// ════════════════════════════════════════════════════════════════

interface CacheEnvelope<T> {
    data: T
    freshUntil: number // Unix ms — when data becomes "stale" but still serveable
}

/**
 * Cache wrapper with stampede protection.
 * - Returns stale data during refresh (stale-while-revalidate pattern)
 * - Uses a Redis SET NX distributed lock so only one function rebuilds
 * - Eliminates thundering herd: N concurrent misses → 1 DB fetch + (N-1) stale serves
 *
 * @param key            Cache key
 * @param ttlSeconds     How long data is "fresh"
 * @param staleTtlSeconds Grace period beyond TTL where stale data is still returned
 * @param fetchFn        Function to fetch fresh data from DB
 */
export async function withStampedeProtection<T>(
    key: string,
    ttlSeconds: number,
    staleTtlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    const client = getRedis()

    // ── Try cache ──
    if (client) {
        try {
            const raw = await client.get(key)
            if (raw) {
                const envelope = (typeof raw === 'string' ? JSON.parse(raw) : raw) as CacheEnvelope<T>
                const now = Date.now()

                if (envelope.freshUntil > now) {
                    // Fresh — return immediately
                    return envelope.data
                }

                // Stale but serveable — return data, refresh in background
                stampedeFetchInBackground(client, key, ttlSeconds, staleTtlSeconds, fetchFn)
                return envelope.data
            }
        } catch {
            // Redis error — fall through to synchronous DB fetch
        }
    }

    // ── No cached data at all — must fetch synchronously ──
    return stampedeWriteThrough(client, key, ttlSeconds, staleTtlSeconds, fetchFn)
}

/**
 * Background refresh: acquires distributed lock, fetches, writes cache.
 * If lock already held by another function, silently returns (stale data already served).
 */
async function stampedeFetchInBackground<T>(
    client: Redis,
    key: string,
    ttlSeconds: number,
    staleTtlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<void> {
    const lockKey = `lock:${key}`
    try {
        // Distributed lock: SET NX with 10s expiry. Only one function wins.
        const acquired = await client.set(lockKey, '1', { nx: true, ex: 10 })
        if (!acquired) return // Another function is already refreshing

        await stampedeWriteThrough(client, key, ttlSeconds, staleTtlSeconds, fetchFn)
    } catch {
        // Non-critical — stale data is still being served to all callers
    }
}

/**
 * Fetch data and write to cache with envelope metadata.
 */
async function stampedeWriteThrough<T>(
    client: Redis | null,
    key: string,
    ttlSeconds: number,
    staleTtlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    const data = await fetchFn()

    if (client) {
        const envelope: CacheEnvelope<T> = {
            data,
            freshUntil: Date.now() + (ttlSeconds * 1000)
        }
        // Total Redis TTL = fresh period + stale grace period
        const totalTtl = ttlSeconds + staleTtlSeconds
        client.set(key, JSON.stringify(envelope), { ex: totalTtl }).catch(() => {})
    }

    return data
}
