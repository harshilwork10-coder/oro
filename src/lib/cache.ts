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

function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        // Gracefully degrade if Redis not configured
        console.warn('[Cache] Redis not configured - caching disabled')
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
    BOOTSTRAP: (locationId: string) => `bootstrap:${locationId}`,
    EMPLOYEES_LOGIN: (locationId: string) => `employees_login:${locationId}`,
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
            console.log(`[Cache] HIT: ${key}`)
            return cached as T
        }
        console.log(`[Cache] MISS: ${key}`)
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
        console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`)
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
        console.log(`[Cache] DELETE: ${key}`)
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
        console.log(`[Cache] DELETE PATTERN: ${pattern} (${keys.length} keys)`)
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
    ])
    console.log(`[Cache] Invalidated all caches for location: ${locationId}`)
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
