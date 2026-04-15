import { prisma } from '@/lib/prisma'

/**
 * Stock Guard — Prevents negative stock in normal workflows
 * 
 * Sprint 1: Product is the CANONICAL retail inventory model.
 * The Item model is NOT queried here. If an ID doesn't match a Product, it fails.
 * This eliminates false parity between two inventory tables.
 * 
 * POLICY:
 * - Default: allowNegativeStock = false (strict mode)
 * - Franchise-level default with optional per-location override
 * - Manager-approved exception only if explicitly configured
 * 
 * STOCK CHECK vs DECREMENT timing:
 * - Direct route (CASH): check + decrement in same request (no gap)
 * - Two-phase (reserve/finalize): check at reserve, decrement at finalize
 *   (15-min max gap — finalize does NOT recheck, approved charges are honored)
 * 
 * Usage:
 *   const result = await checkStockAvailable(productId, qty, franchiseId)
 *   if (!result.allowed) return error(result.error)
 */

export interface StockCheckResult {
    allowed: boolean
    currentStock: number
    requestedQty: number
    resultingStock: number
    sourceModel: 'Product'  // Sprint 1: Always Product, never Item
    error?: string
    overrideAllowed?: boolean
}

/**
 * Check if a stock decrement is allowed.
 * 
 * Sprint 1: Queries Product model ONLY. Item model is not used for sale-time stock.
 * 
 * @param productId - The Product ID to check
 * @param requestedQty - Positive number = quantity to remove
 * @param franchiseId - Required to check franchise-level config
 * @param locationId - Optional location for per-location override
 * @param forceAllow - Manager override bypass
 */
export async function checkStockAvailable(
    productId: string,
    requestedQty: number,
    franchiseId: string,
    locationId?: string,
    forceAllow: boolean = false
): Promise<StockCheckResult> {
    // Sprint 1: Product is the SOLE source of truth for retail inventory
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true }
    })
    
    if (!product) {
        // Sprint 1: No Item fallback. If it's not a Product, fail clearly.
        return {
            allowed: false,
            currentStock: 0,
            requestedQty,
            resultingStock: 0,
            sourceModel: 'Product',
            error: `Product ${productId} not found in Product table. Item model is not used for sale-time stock checks.`
        }
    }

    const currentStock = product.stock ?? 0
    const resultingStock = currentStock - requestedQty

    // Manager override bypasses guard
    if (forceAllow) {
        return { allowed: true, currentStock, requestedQty, resultingStock, sourceModel: 'Product', overrideAllowed: true }
    }

    // Stock is sufficient — always allowed
    if (resultingStock >= 0) {
        return { allowed: true, currentStock, requestedQty, resultingStock, sourceModel: 'Product' }
    }

    // Stock would go negative — check config
    const negativeAllowed = await isNegativeStockAllowed(franchiseId, locationId)
    
    if (negativeAllowed) {
        return { allowed: true, currentStock, requestedQty, resultingStock, sourceModel: 'Product', overrideAllowed: true }
    }

    return {
        allowed: false,
        currentStock,
        requestedQty,
        resultingStock,
        sourceModel: 'Product',
        error: `Insufficient stock. Current: ${currentStock}, Requested: ${requestedQty}. Would result in negative stock (${resultingStock}).`,
        overrideAllowed: false
    }
}

/**
 * Check if negative stock is allowed for a franchise.
 * Sprint 1: allowNegativeStock lives on FranchisorConfig.
 * Location-level override is not currently supported in the schema.
 */
async function isNegativeStockAllowed(franchiseId: string, _locationId?: string): Promise<boolean> {
    // Check franchise-level config (via FranchisorConfig)
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { franchisor: { select: { config: { select: { allowNegativeStock: true } } } } }
    })
    
    if (franchise?.franchisor?.config?.allowNegativeStock !== undefined) {
        return Boolean(franchise.franchisor.config.allowNegativeStock)
    }

    // Global default: strict mode (no negative stock)
    return false
}

export default { checkStockAvailable }
