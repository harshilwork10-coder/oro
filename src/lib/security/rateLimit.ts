/**
 * Simple in-memory rate limiter for API routes
 * SECURITY: Protects against brute force attacks
 * 
 * Note: For production with multiple instances, use Redis-based rate limiting
 */

interface RateLimitEntry {
    count: number
    resetAt: number
}

// In-memory store (works for single instance, use Redis for distributed)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key)
        }
    }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
    maxAttempts: number      // Max attempts allowed
    windowMs: number         // Time window in milliseconds
    blockDurationMs?: number // How long to block after exceeding limit
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: Date
    blocked: boolean
}

/**
 * Check rate limit for a given identifier (IP, email, etc.)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now()
    const key = identifier
    const entry = rateLimitStore.get(key)

    // If no entry or window expired, create new entry
    if (!entry || entry.resetAt < now) {
        const resetAt = now + config.windowMs
        rateLimitStore.set(key, { count: 1, resetAt })
        return {
            allowed: true,
            remaining: config.maxAttempts - 1,
            resetAt: new Date(resetAt),
            blocked: false
        }
    }

    // Increment count
    entry.count++

    // Check if blocked
    if (entry.count > config.maxAttempts) {
        // Extend block duration if configured
        if (config.blockDurationMs) {
            entry.resetAt = now + config.blockDurationMs
        }
        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(entry.resetAt),
            blocked: true
        }
    }

    return {
        allowed: true,
        remaining: config.maxAttempts - entry.count,
        resetAt: new Date(entry.resetAt),
        blocked: false
    }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    // Check common headers for proxied requests
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }

    // Fallback to unknown (should have IP in production)
    return 'unknown'
}

// Pre-configured rate limiters
export const AUTH_RATE_LIMIT: RateLimitConfig = {
    maxAttempts: 5,           // 5 login attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
    blockDurationMs: 30 * 60 * 1000 // Block for 30 mins after limit
}

export const PIN_RATE_LIMIT: RateLimitConfig = {
    maxAttempts: 3,           // 3 PIN attempts
    windowMs: 5 * 60 * 1000,  // per 5 minutes
    blockDurationMs: 15 * 60 * 1000 // Block for 15 mins
}

export const API_RATE_LIMIT: RateLimitConfig = {
    maxAttempts: 100,         // 100 requests
    windowMs: 60 * 1000,      // per minute
}
