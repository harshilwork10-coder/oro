/**
 * Brand Lock Enforcement Utility
 *
 * Used by franchisee/owner-facing API routes to enforce HQ brand lock controls.
 * When a lock is active, the route returns 403 with a clear message.
 *
 * Usage:
 *   const lockError = await checkBrandLock(franchiseId, 'lockPricing');
 *   if (lockError) return lockError;
 *
 * Lock fields on Franchisor:
 *   lockPricing    — blocks price mutations on services and products
 *   lockServices   — blocks service add/edit/delete
 *   lockProducts   — blocks product add/edit/delete
 *   lockCommission — blocks commission rule creation/update
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type BrandLockField = 'lockPricing' | 'lockServices' | 'lockProducts' | 'lockCommission';

const LOCK_MESSAGES: Record<BrandLockField, string> = {
    lockPricing: 'Pricing is locked by Brand HQ. Local price changes are not permitted.',
    lockServices: 'Service management is locked by Brand HQ. Contact HQ to modify services.',
    lockProducts: 'Product catalog is locked by Brand HQ. Contact HQ to modify products.',
    lockCommission: 'Commission rules are locked by Brand HQ. Contact HQ to modify commission settings.',
};

/**
 * Resolves the franchisorId from a franchiseId.
 * Cached per-request since multiple lock checks may happen in the same route.
 */
async function getFranchisorLocks(franchiseId: string): Promise<{
    lockPricing: boolean;
    lockServices: boolean;
    lockProducts: boolean;
    lockCommission: boolean;
} | null> {
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: {
            franchisor: {
                select: {
                    lockPricing: true,
                    lockServices: true,
                    lockProducts: true,
                    lockCommission: true,
                }
            }
        }
    });

    return franchise?.franchisor ?? null;
}

/**
 * Check a single brand lock for a given franchiseId.
 * Returns a 403 NextResponse if the lock is active, or null if allowed.
 *
 * @param franchiseId - The franchise whose HQ locks should be checked
 * @param lock        - Which lock to check
 */
export async function checkBrandLock(
    franchiseId: string | null | undefined,
    lock: BrandLockField
): Promise<NextResponse | null> {
    if (!franchiseId) return null; // No franchise = no lock context

    try {
        const locks = await getFranchisorLocks(franchiseId);
        if (!locks) return null; // No franchisor = not a brand franchise

        if (locks[lock]) {
            return NextResponse.json(
                {
                    error: LOCK_MESSAGES[lock],
                    code: 'BRAND_LOCK_ACTIVE',
                    lock,
                },
                { status: 403 }
            );
        }

        return null; // Lock is off — allow the mutation
    } catch (err) {
        console.error(`[BrandLock] Failed to check ${lock} for franchise ${franchiseId}:`, err);
        return null; // Fail open — don't block on infrastructure errors
    }
}

/**
 * Check multiple locks at once. Returns the first active lock's 403, or null.
 */
export async function checkBrandLocks(
    franchiseId: string | null | undefined,
    locks: BrandLockField[]
): Promise<NextResponse | null> {
    if (!franchiseId) return null;

    try {
        const franchisorLocks = await getFranchisorLocks(franchiseId);
        if (!franchisorLocks) return null;

        for (const lock of locks) {
            if (franchisorLocks[lock]) {
                return NextResponse.json(
                    {
                        error: LOCK_MESSAGES[lock],
                        code: 'BRAND_LOCK_ACTIVE',
                        lock,
                    },
                    { status: 403 }
                );
            }
        }

        return null;
    } catch (err) {
        console.error(`[BrandLock] Failed to check locks for franchise ${franchiseId}:`, err);
        return null;
    }
}
