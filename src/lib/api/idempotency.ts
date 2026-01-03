/**
 * Idempotency Key Support
 * Prevents duplicate processing of requests
 */

import { prisma } from '@/lib/prisma'

interface IdempotencyResult {
    isDuplicate: boolean
    cachedResponse?: unknown
}

/**
 * Check if request with idempotency key has been processed
 * Returns cached response if duplicate
 */
export async function checkIdempotency(
    key: string,
    franchiseId: string,
    expirationMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<IdempotencyResult> {
    const existing = await prisma.idempotencyKey.findUnique({
        where: {
            key_franchiseId: { key, franchiseId }
        }
    })

    if (existing) {
        // Check if expired
        const age = Date.now() - existing.createdAt.getTime()
        if (age > expirationMs) {
            // Delete expired and allow retry
            await prisma.idempotencyKey.delete({
                where: { id: existing.id }
            })
            return { isDuplicate: false }
        }

        return {
            isDuplicate: true,
            cachedResponse: existing.response ? JSON.parse(existing.response) : null
        }
    }

    return { isDuplicate: false }
}

/**
 * Store idempotency key with response
 */
export async function storeIdempotencyKey(
    key: string,
    franchiseId: string,
    response: unknown
): Promise<void> {
    await prisma.idempotencyKey.create({
        data: {
            key,
            franchiseId,
            response: JSON.stringify(response),
        }
    })
}

/**
 * Get idempotency key from request headers
 */
export function getIdempotencyKey(request: Request): string | null {
    return request.headers.get('Idempotency-Key')
}
