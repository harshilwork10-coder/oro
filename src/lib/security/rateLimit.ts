/**
 * Rate Limiting Utility
 * Protects against brute force and denial-of-service attacks
 */

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export interface RateLimitConfig {
    // Number of requests allowed in the window
    limit: number
    // Window size in seconds
    windowSeconds: number
    // Identifier type: 'ip', 'user', or 'combined'
    identifierType?: 'ip' | 'user' | 'combined'
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: Date
    retryAfterSeconds?: number
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS = {
    // Authentication endpoints - stricter limits
    auth: {
        limit: 5,
        windowSeconds: 60 * 15, // 15 minutes
        identifierType: 'ip' as const
    },
    // Login attempts - very strict
    login: {
        limit: 5,
        windowSeconds: 60 * 5, // 5 minutes
        identifierType: 'ip' as const
    },
    // Password reset - strict
    passwordReset: {
        limit: 3,
        windowSeconds: 60 * 60, // 1 hour
        identifierType: 'ip' as const
    },
    // API endpoints - general use
    api: {
        limit: 100,
        windowSeconds: 60, // 1 minute
        identifierType: 'user' as const
    },
    // Heavy operations like bulk delete, export
    heavy: {
        limit: 10,
        windowSeconds: 60 * 5, // 5 minutes
        identifierType: 'user' as const
    },
    // Delete operations
    delete: {
        limit: 20,
        windowSeconds: 60, // 1 minute
        identifierType: 'user' as const
    }
}

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string> {
    try {
        const headersList = await headers()
        const forwardedFor = headersList.get('x-forwarded-for')
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim()
        }

        return headersList.get('x-real-ip') ||
            headersList.get('cf-connecting-ip') ||
            'unknown'
    } catch {
        return 'unknown'
    }
}

/**
 * Generate rate limit identifier based on config
 */
async function getIdentifier(
    config: RateLimitConfig,
    userId?: string
): Promise<string> {
    const ip = await getClientIp()

    switch (config.identifierType) {
        case 'user':
            return userId || ip
        case 'combined':
            return userId ? `${userId}:${ip}` : ip
        case 'ip':
        default:
            return ip
    }
}

/**
 * Check rate limit and update counter
 */
export async function checkRateLimit(
    endpoint: string,
    config: RateLimitConfig,
    userId?: string
): Promise<RateLimitResult> {
    const identifier = await getIdentifier(config, userId)
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    try {
        // Try to find existing record
        const existing = await prisma.rateLimitRecord.findUnique({
            where: {
                identifier_endpoint: {
                    identifier,
                    endpoint
                }
            }
        })

        if (existing) {
            // Check if window has expired
            if (existing.windowStart < windowStart) {
                // Reset the window
                await prisma.rateLimitRecord.update({
                    where: { id: existing.id },
                    data: {
                        count: 1,
                        windowStart: now
                    }
                })

                return {
                    allowed: true,
                    remaining: config.limit - 1,
                    resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
                }
            }

            // Window still active
            if (existing.count >= config.limit) {
                const resetAt = new Date(existing.windowStart.getTime() + config.windowSeconds * 1000)
                const retryAfterSeconds = Math.ceil((resetAt.getTime() - now.getTime()) / 1000)

                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                    retryAfterSeconds
                }
            }

            // Increment counter
            await prisma.rateLimitRecord.update({
                where: { id: existing.id },
                data: { count: existing.count + 1 }
            })

            return {
                allowed: true,
                remaining: config.limit - existing.count - 1,
                resetAt: new Date(existing.windowStart.getTime() + config.windowSeconds * 1000)
            }
        }

        // Create new record
        await prisma.rateLimitRecord.create({
            data: {
                identifier,
                endpoint,
                count: 1,
                windowStart: now
            }
        })

        return {
            allowed: true,
            remaining: config.limit - 1,
            resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
        }
    } catch (error) {
        // If rate limiting fails, allow the request but log the error
        console.error('Rate limiting error:', error)
        return {
            allowed: true,
            remaining: config.limit,
            resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
        }
    }
}

/**
 * Apply rate limiting to a request
 * Returns the rate limit response if blocked, or null if allowed
 */
export async function applyRateLimit(
    endpoint: string,
    config: RateLimitConfig = RATE_LIMITS.api,
    userId?: string
): Promise<NextResponse | null> {
    const result = await checkRateLimit(endpoint, config, userId)

    if (!result.allowed) {
        return NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`,
                retryAfter: result.retryAfterSeconds
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(result.retryAfterSeconds),
                    'X-RateLimit-Limit': String(config.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': result.resetAt.toISOString()
                }
            }
        )
    }

    return null
}

/**
 * Get rate limit headers to add to successful responses
 */
export function getRateLimitHeaders(
    result: RateLimitResult,
    config: RateLimitConfig
): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': result.resetAt.toISOString()
    }
}

/**
 * Clean up old rate limit records
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupRateLimitRecords(
    olderThanHours: number = 24
): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

    const result = await prisma.rateLimitRecord.deleteMany({
        where: {
            windowStart: {
                lt: cutoff
            }
        }
    })

    return result.count
}
