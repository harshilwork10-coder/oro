/**
 * Brand Lock Enforcement
 *
 * Shared helper for checking and enforcing brand-level setting locks.
 *
 * GOVERNANCE RULES:
 *   BRAND_FRANCHISOR → Brand HQ controls locked fields; franchisees cannot override.
 *   MULTI_LOCATION_OWNER → Owner has full autonomy; no locks apply.
 *
 * This helper is used by ALL write routes that touch governed settings
 * (pricing, services, commission, products). UI disabling alone is NOT sufficient.
 */

import { prisma } from '@/lib/prisma'

// ════════════════════════════════════════════════════════════════════
// FIELD → LOCK MAPPING
// Maps FranchiseSettings fields to the Franchisor.lock* field that governs them.
// ════════════════════════════════════════════════════════════════════

export type BrandLockName = 'lockPricing' | 'lockServices' | 'lockCommission' | 'lockProducts'

/**
 * Which Franchisor lock governs which settings fields.
 * If a field is not in this map, it is NOT governed by brand locks.
 */
const FIELD_LOCK_MAP: Record<string, BrandLockName> = {
    // lockPricing — controls all pricing-related fields
    pricingModel: 'lockPricing',
    cardSurcharge: 'lockPricing',
    cardSurchargeType: 'lockPricing',
    showDualPricing: 'lockPricing',
    taxRate: 'lockPricing',
    maxDiscountPercent: 'lockPricing',
    promoStackingMode: 'lockPricing',

    // lockServices — controls service catalog edits
    // (enforced on service CRUD routes, not settings routes)

    // lockCommission — controls commission calculation settings
    commissionCalculation: 'lockCommission',
    commissionVisibility: 'lockCommission',

    // lockProducts — controls product catalog edits
    // (enforced on product CRUD routes, not settings routes)
}

export { FIELD_LOCK_MAP }

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export interface BrandLockState {
    /** Is this a brand-governed franchise? */
    isBrandGoverned: boolean
    /** The active locks (only relevant if isBrandGoverned) */
    locks: {
        lockPricing: boolean
        lockServices: boolean
        lockCommission: boolean
        lockProducts: boolean
    }
    /** The business type */
    businessType: string
}

export interface LockEnforcementResult {
    /** Are all requested fields allowed? */
    allowed: boolean
    /** Which fields were blocked (if any) */
    blockedFields: string[]
    /** Which lock caused the block (if any) */
    blockedByLock: BrandLockName | null
    /** Human-readable message */
    message: string
}

// ════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Get the lock state for a franchise.
 *
 * Returns whether the franchise is under brand governance and what locks are active.
 * For MULTI_LOCATION_OWNER, all locks are `false` (autonomous).
 */
export async function getBrandLockState(franchiseId: string): Promise<BrandLockState> {
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: {
            franchisor: {
                select: {
                    businessType: true,
                    lockPricing: true,
                    lockServices: true,
                    lockCommission: true,
                    lockProducts: true,
                }
            }
        }
    })

    const franchisor = franchise?.franchisor

    if (!franchisor) {
        // No franchisor found — default to autonomous
        return {
            isBrandGoverned: false,
            locks: { lockPricing: false, lockServices: false, lockCommission: false, lockProducts: false },
            businessType: 'MULTI_LOCATION_OWNER'
        }
    }

    const isBrand = franchisor.businessType === 'BRAND_FRANCHISOR'

    return {
        isBrandGoverned: isBrand,
        locks: {
            lockPricing: isBrand ? franchisor.lockPricing : false,
            lockServices: isBrand ? franchisor.lockServices : false,
            lockCommission: isBrand ? franchisor.lockCommission : false,
            lockProducts: isBrand ? franchisor.lockProducts : false,
        },
        businessType: franchisor.businessType || 'MULTI_LOCATION_OWNER'
    }
}

/**
 * Enforce brand locks against a set of fields being written.
 *
 * Call this BEFORE writing to FranchiseSettings in any settings update route.
 *
 * @param franchiseId - The franchise being updated
 * @param fieldsBeingWritten - Object keys from the request body
 * @returns LockEnforcementResult — check `.allowed` before proceeding
 *
 * @example
 * ```ts
 * const enforcement = await enforceBrandLocks(user.franchiseId, Object.keys(body))
 * if (!enforcement.allowed) {
 *     return NextResponse.json({
 *         error: enforcement.message,
 *         blockedFields: enforcement.blockedFields,
 *     }, { status: 403 })
 * }
 * ```
 */
export async function enforceBrandLocks(
    franchiseId: string,
    fieldsBeingWritten: string[]
): Promise<LockEnforcementResult> {
    const lockState = await getBrandLockState(franchiseId)

    // MULTI_LOCATION_OWNER — no locks, always allowed
    if (!lockState.isBrandGoverned) {
        return { allowed: true, blockedFields: [], blockedByLock: null, message: 'OK' }
    }

    // BRAND_FRANCHISOR — check each field against its governing lock
    const blockedFields: string[] = []
    let blockedByLock: BrandLockName | null = null

    for (const field of fieldsBeingWritten) {
        const governingLock = FIELD_LOCK_MAP[field]
        if (governingLock && lockState.locks[governingLock]) {
            blockedFields.push(field)
            if (!blockedByLock) blockedByLock = governingLock
        }
    }

    if (blockedFields.length > 0) {
        const lockLabel = blockedByLock === 'lockPricing' ? 'Pricing'
            : blockedByLock === 'lockServices' ? 'Services'
            : blockedByLock === 'lockCommission' ? 'Commission'
            : 'Products'

        return {
            allowed: false,
            blockedFields,
            blockedByLock,
            message: `${lockLabel} settings are controlled by your Brand HQ and cannot be changed at the location level. Contact your brand administrator to request changes.`
        }
    }

    return { allowed: true, blockedFields: [], blockedByLock: null, message: 'OK' }
}

/**
 * Strip locked fields from a request body.
 *
 * Alternative to hard-reject: silently removes locked fields and proceeds
 * with the remaining unlocked fields. Use this for mixed-field updates where
 * some fields may be locked and others are not.
 *
 * @returns The sanitized body with locked fields removed, plus metadata about what was stripped.
 */
export async function stripLockedFields<T extends Record<string, unknown>>(
    franchiseId: string,
    body: T
): Promise<{ sanitizedBody: Partial<T>; strippedFields: string[] }> {
    const lockState = await getBrandLockState(franchiseId)

    if (!lockState.isBrandGoverned) {
        return { sanitizedBody: body, strippedFields: [] }
    }

    const sanitizedBody: Partial<T> = {}
    const strippedFields: string[] = []

    for (const [key, value] of Object.entries(body)) {
        const governingLock = FIELD_LOCK_MAP[key]
        if (governingLock && lockState.locks[governingLock]) {
            strippedFields.push(key)
        } else {
            (sanitizedBody as any)[key] = value
        }
    }

    return { sanitizedBody, strippedFields }
}
