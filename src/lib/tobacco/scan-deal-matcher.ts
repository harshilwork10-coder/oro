/**
 * Tobacco Scan Deal Matcher
 *
 * Pre-checkout matching engine: given cart items with UPCs,
 * returns which TobaccoScanDeals apply and the discount per item.
 *
 * Architecture:
 *   - Pre-checkout: match + display discount in cart
 *   - Post-checkout: persist TobaccoScanEvent rows only after COMPLETED sale
 *   - Abandoned/voided/suspended carts create NO scan events
 */

import type { TobaccoScanDeal, TobaccoScanDealUPC } from '@prisma/client'

// ─── Input Types ──────────────────────────────────────────────────

export interface CartItem {
  upc: string
  qty: number
  price: number                 // Shelf price per unit
  packOrCarton: 'PACK' | 'CARTON'
  lineItemIndex?: number        // Position in cart for UI mapping
}

// ─── Output Types ─────────────────────────────────────────────────

export interface DealMatch {
  dealId: string
  dealName: string
  manufacturer: string
  type: string                  // BUYDOWN | MULTIBUY | THRESHOLD | MIX_MATCH
  upc: string
  lineItemIndex?: number        // Maps back to cart position
  qtyApplied: number            // How many units this deal applies to
  discountPerUnit: number
  totalDiscount: number
  reimbursementPerUnit: number
  totalReimbursement: number
  packOrCarton: 'PACK' | 'CARTON'
}

export interface MatchResult {
  matches: DealMatch[]
  totalDiscount: number
  totalReimbursement: number
}

// ─── Deal with UPCs (what we load from DB) ────────────────────────

export type DealWithUpcs = TobaccoScanDeal & {
  eligibleUpcs: TobaccoScanDealUPC[]
}

// ─── Matcher ──────────────────────────────────────────────────────

/**
 * Match cart items against active tobacco scan deals.
 *
 * @param cartItems - Items currently in the POS cart
 * @param activeDeals - Active TobaccoScanDeals with eligibleUpcs loaded
 * @param storeId - Current location ID (for store-scoped deals)
 * @returns MatchResult with all applicable deals and totals
 */
export function matchTobaccoDeals(
  cartItems: CartItem[],
  activeDeals: DealWithUpcs[],
  storeId: string
): MatchResult {
  const matches: DealMatch[] = []
  const now = new Date()

  // Filter to truly active deals
  const eligibleDeals = activeDeals.filter(deal => {
    if (deal.status !== 'ACTIVE') return false
    if (deal.startDate > now) return false
    if (deal.endDate && deal.endDate < now) return false
    // Store scope: empty storeIds = all stores
    if (deal.storeIds.length > 0 && !deal.storeIds.includes(storeId)) return false
    return true
  })

  // Build UPC → deal lookup for O(1) matching
  const upcToDealMap = new Map<string, DealWithUpcs[]>()
  for (const deal of eligibleDeals) {
    for (const upcEntry of deal.eligibleUpcs) {
      const existing = upcToDealMap.get(upcEntry.upc) || []
      existing.push(deal)
      upcToDealMap.set(upcEntry.upc, existing)
    }
  }

  // Track per-deal application counts for customerLimitPerTxn
  const dealApplicationCounts = new Map<string, number>()

  // Match each cart item
  for (const item of cartItems) {
    const candidateDeals = upcToDealMap.get(item.upc)
    if (!candidateDeals || candidateDeals.length === 0) continue

    // Get applicable deals for this item
    const itemMatches: DealMatch[] = []

    for (const deal of candidateDeals) {
      // Check appliesToLevel
      if (deal.appliesToLevel !== 'BOTH' && deal.appliesToLevel !== item.packOrCarton) continue

      // Check minQty
      const effectiveQty = item.packOrCarton === 'CARTON' && deal.appliesToLevel === 'PACK'
        ? item.qty * 10  // Expand carton to packs
        : item.qty

      if (effectiveQty < deal.minQty) continue

      // Check customerLimitPerTxn
      const currentCount = dealApplicationCounts.get(deal.id) || 0
      if (deal.customerLimitPerTxn !== null && currentCount >= deal.customerLimitPerTxn) continue

      // Calculate applicable quantity
      let qtyApplied = effectiveQty
      if (deal.maxQty !== null && qtyApplied > deal.maxQty) {
        qtyApplied = deal.maxQty
      }
      if (deal.customerLimitPerTxn !== null) {
        const remaining = deal.customerLimitPerTxn - currentCount
        qtyApplied = Math.min(qtyApplied, remaining)
      }

      // Calculate discount per unit
      const rewardValue = Number(deal.rewardValue)
      let discountPerUnit: number

      switch (deal.rewardType) {
        case 'FIXED_AMOUNT':
          discountPerUnit = rewardValue
          break
        case 'PERCENTAGE':
          discountPerUnit = Math.round(item.price * (rewardValue / 100) * 100) / 100
          break
        case 'PENNY_DEAL':
          discountPerUnit = Math.max(0, item.price - 0.01)
          break
        case 'FREE_UNIT':
          // For MULTIBUY: buy minQty, get 1 free → discount = price of 1 unit spread
          discountPerUnit = item.price
          qtyApplied = Math.floor(effectiveQty / deal.minQty) // Only free units
          break
        default:
          discountPerUnit = rewardValue
      }

      // Cap discount at item price (can't discount below $0)
      discountPerUnit = Math.min(discountPerUnit, item.price)

      const reimbursementPerUnit = Number(deal.reimbursementPerUnit)

      const match: DealMatch = {
        dealId: deal.id,
        dealName: deal.dealName,
        manufacturer: deal.manufacturer,
        type: deal.type,
        upc: item.upc,
        lineItemIndex: item.lineItemIndex,
        qtyApplied,
        discountPerUnit,
        totalDiscount: Math.round(discountPerUnit * qtyApplied * 100) / 100,
        reimbursementPerUnit,
        totalReimbursement: Math.round(reimbursementPerUnit * qtyApplied * 100) / 100,
        packOrCarton: item.packOrCarton,
      }

      itemMatches.push(match)
    }

    if (itemMatches.length === 0) continue

    // If any deal is non-stackable, pick the best one (highest discount)
    const hasNonStackable = itemMatches.some(m => {
      const deal = candidateDeals.find(d => d.id === m.dealId)
      return deal && !deal.stackable
    })

    if (hasNonStackable) {
      // Pick single best deal by total discount
      const best = itemMatches.reduce((a, b) => a.totalDiscount > b.totalDiscount ? a : b)
      matches.push(best)
      dealApplicationCounts.set(best.dealId, (dealApplicationCounts.get(best.dealId) || 0) + best.qtyApplied)
    } else {
      // Stack all deals
      for (const m of itemMatches) {
        matches.push(m)
        dealApplicationCounts.set(m.dealId, (dealApplicationCounts.get(m.dealId) || 0) + m.qtyApplied)
      }
    }
  }

  return {
    matches,
    totalDiscount: Math.round(matches.reduce((s, m) => s + m.totalDiscount, 0) * 100) / 100,
    totalReimbursement: Math.round(matches.reduce((s, m) => s + m.totalReimbursement, 0) * 100) / 100,
  }
}
