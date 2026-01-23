// Rate Limiting Utility
// Simple in-memory rate limiter for API endpoints

interface RateLimitEntry {
    count: number
    resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
    windowMs?: number      // Time window in milliseconds
    maxRequests?: number   // Max requests per window
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (IP, userId, etc.)
 * @param options - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
    key: string,
    options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetIn: number } {
    const windowMs = options.windowMs || 60 * 1000  // Default: 1 minute
    const maxRequests = options.maxRequests || 10   // Default: 10 requests

    const now = Date.now()
    const entry = rateLimitStore.get(key)

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
        cleanupExpiredEntries()
    }

    // No existing entry or expired
    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs
        })
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetIn: windowMs
        }
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: entry.resetTime - now
        }
    }

    // Increment and allow
    entry.count++
    return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetIn: entry.resetTime - now
    }
}

/**
 * Get rate limit key from request
 * PRODUCTION: Use (stationId + route) not IP
 */
export function getRateLimitKey(request: Request, route: string = 'api'): string {
    // Prefer stationId from headers (set by Android POS)
    const stationId = request.headers.get('x-station-id')
    const locationId = request.headers.get('x-location-id')

    // Fall back to IP if no station context
    if (stationId) {
        return `station:${stationId}:${route}`
    }
    if (locationId) {
        return `location:${locationId}:${route}`
    }

    // Fallback to IP (for web requests)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'
    return `ip:${ip}:${route}`
}

/**
 * Cleanup expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key)
        }
    }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate phone number (basic - at least 10 digits)
 */
export function isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .substring(0, 1000)      // Limit length
}

// Preset rate limits for different endpoints
export const RATE_LIMITS = {
    // Very strict - for sensitive operations
    strict: { windowMs: 60 * 1000, maxRequests: 3 },

    // Standard - for public forms
    standard: { windowMs: 60 * 1000, maxRequests: 10 },

    // Relaxed - for read operations
    relaxed: { windowMs: 60 * 1000, maxRequests: 30 },

    // Booking - allow reasonable booking attempts
    booking: { windowMs: 5 * 60 * 1000, maxRequests: 5 },

    // SMS - prevent spam
    sms: { windowMs: 60 * 60 * 1000, maxRequests: 10 },

    // Password reset - very strict
    passwordReset: { windowMs: 15 * 60 * 1000, maxRequests: 3 },

    // ═══════════════════════════════════════════════════════════════════
    // POS API RATE LIMITS - Non-critical endpoints only
    // ═══════════════════════════════════════════════════════════════════

    // Menu/catalog fetches - should use bootstrap instead
    posMenu: { windowMs: 60 * 1000, maxRequests: 30 },

    // Client search - with debounce on client, this should be low
    posClients: { windowMs: 60 * 1000, maxRequests: 60 },

    // Smart tiles - cached on server, shouldn't need frequent calls
    posSmartTiles: { windowMs: 60 * 1000, maxRequests: 30 },

    // Transaction list - paginated, shouldn't refresh constantly
    posTransactions: { windowMs: 60 * 1000, maxRequests: 30 },
}

// Routes that should NEVER be rate limited (critical POS operations)
export const NEVER_THROTTLE_ROUTES = [
    '/api/pos/transaction',      // Checkout
    '/api/pos/refund',           // Refunds
    '/api/pos/void',             // Voids
    '/api/pos/shift',            // Shift open/close
    '/api/pos/timeclock',        // Clock in/out
    '/api/pos/bootstrap',        // Startup - essential
    '/api/pos/email-receipt',    // Receipt sending
    '/api/pos/sms-receipt',      // Receipt sending
    '/api/pos/payout',           // Cash payouts
    '/api/drawer-activity',      // Cash drawer
]

/**
 * Check if a route should never be rate limited (critical POS flow)
 */
export function isCriticalRoute(route: string): boolean {
    return NEVER_THROTTLE_ROUTES.some(r => route.includes(r))
}

