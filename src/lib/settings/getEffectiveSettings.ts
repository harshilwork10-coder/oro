/**
 * Effective Settings Reader
 *
 * Single read path for resolving the effective runtime settings for a franchise.
 * Eliminates scattered raw reads across API routes.
 *
 * RESOLUTION ORDER:
 *   1. FranchiseSettings (live runtime source of truth)
 *   2. BusinessConfig (provider default/seed fallback for missing fields)
 *   3. Hardcoded defaults (last resort)
 *
 * GOVERNANCE:
 *   BRAND_FRANCHISOR + locked fields → brand-governed value from BusinessConfig overrides
 *   MULTI_LOCATION_OWNER → FranchiseSettings always wins
 */

import { prisma } from '@/lib/prisma'
import { getBrandLockState, FIELD_LOCK_MAP } from './brandLocks'

// ════════════════════════════════════════════════════════════════════
// EFFECTIVE SETTINGS TYPE
// ════════════════════════════════════════════════════════════════════

export interface EffectiveSettings {
    // Pricing (live runtime)
    pricingModel: string
    cardSurcharge: number
    cardSurchargeType: string
    showDualPricing: boolean
    dualPricingEnabled: boolean

    // Tax (live runtime)
    taxRate: number

    // Tips (currently on BusinessConfig, future: FranchiseSettings)
    tipPromptEnabled: boolean
    tipType: string
    tipSuggestions: string

    // Payment options (currently on BusinessConfig, future: FranchiseSettings)
    acceptsEbt: boolean
    acceptsChecks: boolean
    acceptsOnAccount: boolean

    // Operational controls
    requireManagerPinAbove: number | null
    refundLimitPerDay: number | null
    maxDiscountPercent: number | null
    allowNegativeStock: boolean
    autoLockMinutes: number

    // Receipt
    receiptPrintMode: string | null
    openDrawerOnCash: boolean

    // Shift
    shiftRequirement: string

    // Metadata
    _source: {
        businessType: string
        isBrandGoverned: boolean
        lockState: Record<string, boolean>
    }
}

// ════════════════════════════════════════════════════════════════════
// HARDCODED DEFAULTS (last resort if both models are null)
// ════════════════════════════════════════════════════════════════════

const DEFAULTS = {
    pricingModel: 'STANDARD',
    cardSurcharge: 3.99,
    cardSurchargeType: 'PERCENTAGE',
    showDualPricing: false,
    taxRate: 0.0825,
    tipPromptEnabled: true,
    tipType: 'PERCENT',
    tipSuggestions: '[15,20,25]',
    acceptsEbt: false,
    acceptsChecks: false,
    acceptsOnAccount: false,
    requireManagerPinAbove: null,
    refundLimitPerDay: null,
    maxDiscountPercent: null,
    allowNegativeStock: false,
    autoLockMinutes: 3,
    receiptPrintMode: null,
    openDrawerOnCash: true,
    shiftRequirement: 'NONE',
} as const

// ════════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ════════════════════════════════════════════════════════════════════

/**
 * Get the effective runtime settings for a franchise.
 *
 * This is the SINGLE read path for all runtime configuration.
 * No more scattered prisma queries across 10+ API routes.
 *
 * @param franchiseId - The franchise to resolve settings for
 * @returns EffectiveSettings with all fields resolved from the correct source
 */
export async function getEffectiveSettings(franchiseId: string): Promise<EffectiveSettings> {
    // Fetch FranchiseSettings + BusinessConfig in parallel
    const [franchiseSettings, franchise] = await Promise.all([
        prisma.franchiseSettings.findUnique({
            where: { franchiseId }
        }),
        prisma.franchise.findUnique({
            where: { id: franchiseId },
            select: {
                franchisorId: true,
                franchisor: {
                    select: {
                        businessType: true,
                        config: true,
                    }
                }
            }
        })
    ])

    const businessConfig = franchise?.franchisor?.config as any
    const fs = franchiseSettings as any

    // Get lock state for governance
    const lockState = await getBrandLockState(franchiseId)

    // ════════════════════════════════════════════════════════════════════
    // RESOLVE EACH FIELD:
    //   1. If brand-governed + locked → BusinessConfig value (brand standard)
    //   2. FranchiseSettings value (if populated)
    //   3. BusinessConfig value (provider default)
    //   4. Hardcoded default
    // ════════════════════════════════════════════════════════════════════

    function resolve<T>(
        fieldName: string,
        fsValue: T | null | undefined,
        bcValue: T | null | undefined,
        defaultValue: T
    ): T {
        // Check if field is brand-locked
        const governingLock = FIELD_LOCK_MAP[fieldName]
        if (governingLock && lockState.isBrandGoverned && lockState.locks[governingLock]) {
            // Brand-governed: BusinessConfig value wins (brand standard)
            if (bcValue != null) return bcValue
        }

        // Normal resolution: FranchiseSettings → BusinessConfig → default
        if (fsValue != null) return fsValue
        if (bcValue != null) return bcValue
        return defaultValue
    }

    const pricingModel = resolve('pricingModel', fs?.pricingModel, businessConfig?.pricingModel, DEFAULTS.pricingModel)
    const showDualPricing = resolve('showDualPricing', fs?.showDualPricing, businessConfig?.showDualPricing, DEFAULTS.showDualPricing)

    const cardSurcharge = resolve(
        'cardSurcharge',
        fs?.cardSurcharge != null ? parseFloat(fs.cardSurcharge.toString()) : null,
        businessConfig?.cardSurcharge != null ? parseFloat(businessConfig.cardSurcharge.toString()) : null,
        DEFAULTS.cardSurcharge
    )

    const taxRate = resolve(
        'taxRate',
        fs?.taxRate != null ? parseFloat(fs.taxRate.toString()) : null,
        businessConfig?.taxRate != null ? parseFloat(businessConfig.taxRate.toString()) : null,
        DEFAULTS.taxRate
    )

    return {
        // Pricing
        pricingModel,
        cardSurcharge,
        cardSurchargeType: resolve('cardSurchargeType', fs?.cardSurchargeType, businessConfig?.cardSurchargeType, DEFAULTS.cardSurchargeType),
        showDualPricing,
        dualPricingEnabled: pricingModel === 'DUAL_PRICING' && showDualPricing,

        // Tax
        taxRate,

        // Tips — currently only on BusinessConfig, fallback to defaults
        tipPromptEnabled: businessConfig?.tipPromptEnabled ?? DEFAULTS.tipPromptEnabled,
        tipType: businessConfig?.tipType ?? DEFAULTS.tipType,
        tipSuggestions: businessConfig?.tipSuggestions ?? DEFAULTS.tipSuggestions,

        // Payment options — currently only on BusinessConfig
        acceptsEbt: businessConfig?.acceptsEbt ?? DEFAULTS.acceptsEbt,
        acceptsChecks: businessConfig?.acceptsChecks ?? DEFAULTS.acceptsChecks,
        acceptsOnAccount: businessConfig?.acceptsOnAccount ?? DEFAULTS.acceptsOnAccount,

        // Operational controls — resolve from FranchiseSettings with BC fallback
        requireManagerPinAbove: resolve(
            'requireManagerPinAbove',
            fs?.requireManagerPinAbove != null ? parseFloat(fs.requireManagerPinAbove.toString()) : null,
            businessConfig?.requireManagerPinAbove != null ? parseFloat(businessConfig.requireManagerPinAbove.toString()) : null,
            DEFAULTS.requireManagerPinAbove
        ),
        refundLimitPerDay: resolve(
            'refundLimitPerDay',
            fs?.refundLimitPerDay != null ? parseFloat(fs.refundLimitPerDay.toString()) : null,
            businessConfig?.refundLimitPerDay != null ? parseFloat(businessConfig.refundLimitPerDay.toString()) : null,
            DEFAULTS.refundLimitPerDay
        ),
        maxDiscountPercent: resolve(
            'maxDiscountPercent',
            fs?.maxDiscountPercent != null ? parseFloat(fs.maxDiscountPercent.toString()) : null,
            businessConfig?.discountMaxPercent != null ? parseFloat(businessConfig.discountMaxPercent.toString()) : null,
            DEFAULTS.maxDiscountPercent
        ),
        allowNegativeStock: businessConfig?.allowNegativeStock ?? DEFAULTS.allowNegativeStock,
        autoLockMinutes: businessConfig?.autoLockMinutes ?? DEFAULTS.autoLockMinutes,

        // Receipt
        receiptPrintMode: fs?.receiptPrintMode ?? DEFAULTS.receiptPrintMode,
        openDrawerOnCash: fs?.openDrawerOnCash ?? DEFAULTS.openDrawerOnCash,

        // Shift
        shiftRequirement: businessConfig?.shiftRequirement ?? DEFAULTS.shiftRequirement,

        // Metadata — for UI to know what's locked
        _source: {
            businessType: lockState.businessType,
            isBrandGoverned: lockState.isBrandGoverned,
            lockState: lockState.locks,
        }
    }
}
