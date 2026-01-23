// API Log Helper - Track API usage per location/station for cost optimization
// PRODUCTION: Sampling (100% errors, 10% success) + response bytes

import { prisma } from '@/lib/prisma'

// Sampling configuration (can be overridden via env)
const SUCCESS_SAMPLE_RATE = parseFloat(process.env.API_LOG_SUCCESS_SAMPLE_RATE || '0.1') // 10% of 2xx
const ERROR_SAMPLE_RATE = 1.0 // 100% of errors

interface LogApiCallParams {
    locationId?: string
    stationId?: string
    userId?: string
    route: string
    method: string
    status: number
    latencyMs: number
    responseBytes?: number
    userAgent?: string
}

/**
 * Determine status class (2xx, 4xx, 5xx)
 */
function getStatusClass(status: number): string {
    if (status >= 500) return '5xx'
    if (status >= 400) return '4xx'
    if (status >= 300) return '3xx'
    if (status >= 200) return '2xx'
    return '1xx'
}

/**
 * Should this request be sampled?
 * 100% of errors, configurable % of successes
 */
function shouldSample(status: number): boolean {
    if (status >= 400) return true // Always log errors
    return Math.random() < SUCCESS_SAMPLE_RATE
}

/**
 * Log an API call for usage tracking (with sampling)
 * Fire and forget - doesn't block the response
 */
export async function logApiCall({
    locationId,
    stationId,
    userId,
    route,
    method,
    status,
    latencyMs,
    responseBytes,
    userAgent
}: LogApiCallParams): Promise<void> {
    // Apply sampling
    const sampled = shouldSample(status)
    if (!sampled) return // Skip logging this request

    try {
        // Fire and forget - don't await in critical path
        prisma.apiLog.create({
            data: {
                locationId,
                stationId,
                userId,
                route,
                method,
                status,
                statusClass: getStatusClass(status),
                latencyMs,
                responseBytes,
                userAgent,
                sampled: true
            }
        }).catch(err => {
            console.error('[API_LOG] Failed to log:', err)
        })
    } catch (error) {
        console.error('[API_LOG] Error:', error)
    }
}

/**
 * Higher-order function to wrap API route handlers with automatic logging
 * Excludes sensitive routes from detailed logging
 */
export function withApiLogging<T>(
    handler: (req: Request) => Promise<T>,
    routeName: string
): (req: Request) => Promise<T> {
    return async (req: Request): Promise<T> => {
        const startTime = Date.now()

        try {
            const response = await handler(req)
            const latencyMs = Date.now() - startTime

            // Extract context from headers (set by Android app)
            const locationId = req.headers.get('x-location-id') || undefined
            const stationId = req.headers.get('x-station-id') || undefined
            const userId = req.headers.get('x-user-id') || undefined
            const userAgent = req.headers.get('user-agent') || undefined

            // Get status and response size
            let status = 200
            let responseBytes: number | undefined
            if (response instanceof Response) {
                status = response.status
                const contentLength = response.headers.get('content-length')
                if (contentLength) {
                    responseBytes = parseInt(contentLength)
                }
            }

            // Skip logging for sensitive routes
            const sensitiveRoutes = ['/api/auth/', '/api/pos/verify-owner-pin', '/api/admin/reset']
            const isSensitive = sensitiveRoutes.some(r => routeName.includes(r))

            if (!isSensitive) {
                logApiCall({
                    locationId,
                    stationId,
                    userId,
                    route: routeName,
                    method: req.method,
                    status,
                    latencyMs,
                    responseBytes,
                    userAgent
                })
            }

            return response
        } catch (error) {
            const latencyMs = Date.now() - startTime
            const locationId = req.headers.get('x-location-id') || undefined
            const stationId = req.headers.get('x-station-id') || undefined
            const userId = req.headers.get('x-user-id') || undefined

            logApiCall({
                locationId,
                stationId,
                userId,
                route: routeName,
                method: req.method,
                status: 500,
                latencyMs
            })

            throw error
        }
    }
}

// Route categories for analysis
export const RouteCategories = {
    // CRITICAL: Never throttle, never cache
    CRITICAL: [
        '/transaction', '/checkout', '/payment',
        '/refund', '/void', '/shift',
        '/drawer-activity', '/payout', '/pay-in',
        '/receipt', '/clock-in', '/clock-out'
    ],
    // HIGH_VOLUME: Candidates for optimization
    HIGH_VOLUME: ['menu', 'staff', 'clients', 'smart-tiles', 'transactions'],
    // CACHEABLE: Can use ETag/304
    CACHEABLE: ['menu', 'staff', 'settings', 'station/config', 'pax/settings', 'bootstrap'],
    // THROTTLEABLE: Safe to rate limit
    THROTTLEABLE: ['menu', 'staff', 'clients', 'smart-tiles', 'transactions', 'reports']
} as const

/**
 * Check if a route is critical (never throttle)
 */
export function isCriticalRoute(route: string): boolean {
    return RouteCategories.CRITICAL.some(r => route.includes(r))
}

/**
 * Check if a route can be throttled
 */
export function isThrottleableRoute(route: string): boolean {
    if (isCriticalRoute(route)) return false
    return RouteCategories.THROTTLEABLE.some(r => route.includes(r))
}
