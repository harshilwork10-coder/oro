import { SalonLoyaltyProgram, SalonLoyaltyProgramRule } from '@prisma/client'

export interface LoyaltyEvaluationItem {
    id: string
    serviceId?: string
    categoryId?: string
    price: number
    quantity: number
}

/**
 * Given a program and its rules, determines if an item qualifies for loyalty accrual.
 */
export function isItemQualifying(
    item: LoyaltyEvaluationItem,
    programRules: SalonLoyaltyProgramRule[]
): boolean {
    if (!item.serviceId && !item.categoryId) return false
    
    let isIncluded = false
    
    // If there are no specific inclusion rules, arguably everything qualifies unless excluded.
    // However, the best practice is default-deny for loyalty to avoid margin leakage.
    // If rules array is empty, we'll assume it applies to everything (for simplicity if no rules define inclusion)
    // Actually, let's check if there are ANY include rules
    const includeRules = programRules.filter(r => !r.excluded)
    const excludeRules = programRules.filter(r => r.excluded)

    // Check exclusions first (strongest rule)
    for (const exRule of excludeRules) {
        if (exRule.serviceId && item.serviceId === exRule.serviceId) return false
        if (exRule.categoryId && item.categoryId === exRule.categoryId) return false
    }

    // If no inclusion rules defined, assume global qualification (minus exclusions)
    if (includeRules.length === 0) return true

    // Check inclusions
    for (const inRule of includeRules) {
        if (inRule.serviceId && item.serviceId === inRule.serviceId) isIncluded = true
        if (inRule.categoryId && item.categoryId === inRule.categoryId) isIncluded = true
    }

    return isIncluded
}

export function filterQualifyingItems(
    items: LoyaltyEvaluationItem[],
    programRules: SalonLoyaltyProgramRule[],
    program: SalonLoyaltyProgram,
    currentLocationId: string
): LoyaltyEvaluationItem[] {
    
    if (program.appliesToSameLocationOnly && program.locationId !== currentLocationId) {
        return []
    }

    return items.filter(item => isItemQualifying(item, programRules))
}

export function calculatePotentialPunches(
    qualifyingItems: LoyaltyEvaluationItem[],
    program: SalonLoyaltyProgram
): number {
    if (qualifyingItems.length === 0) return 0

    // V1 Earn Modes: 'ONE_PER_QUALIFYING_VISIT'
    if (program.earnMode === 'ONE_PER_QUALIFYING_VISIT') {
        return 1 // Max 1 per checkout regardless of line items
    }
    
    if (program.earnMode === 'ONE_PER_QUALIFYING_ITEM') {
        return qualifyingItems.reduce((acc, item) => acc + item.quantity, 0)
    }

    return 1 // Safe fallback
}
