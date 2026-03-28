import { prisma } from '@/lib/prisma'

/**
 * Stock Guard — Prevents negative stock in normal workflows
 * 
 * POLICY:
 * - Default: allowNegativeStock = false (strict mode)
 * - Franchise-level default with optional per-location override
 * - Manager-approved exception only if explicitly configured
 * 
 * Usage:
 *   const result = await checkStockAvailable(itemId, requestedQty, locationId)
 *   if (!result.allowed) return error(result.error)
 */

export interface StockCheckResult {
    allowed: boolean
    currentStock: number
    requestedQty: number
    resultingStock: number
    error?: string
    overrideAllowed?: boolean
}

/**
 * Check if a stock decrement is allowed.
 * 
 * @param productId - The product to check (works with both Product and Item models)
 * @param requestedQty - Positive number = quantity to remove
 * @param locationId - Optional location for per-location override
 * @param franchiseId - Required to check franchise-level config
 * @param forceAllow - Manager override bypass
 */
export async function checkStockAvailable(
    productId: string,
    requestedQty: number,
    franchiseId: string,
    locationId?: string,
    forceAllow: boolean = false
): Promise<StockCheckResult> {
    // Get current stock
    let currentStock = 0
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true }
    })
    
    if (product) {
        currentStock = product.stock ?? 0
    } else {
        // Try Item model
        const item = await prisma.item.findUnique({
            where: { id: productId },
            select: { stock: true }
        })
        if (item) {
            currentStock = item.stock ?? 0
        } else {
            return {
                allowed: false,
                currentStock: 0,
                requestedQty,
                resultingStock: 0,
                error: `Product ${productId} not found`
            }
        }
    }

    const resultingStock = currentStock - requestedQty

    // Manager override bypasses guard
    if (forceAllow) {
        return { allowed: true, currentStock, requestedQty, resultingStock, overrideAllowed: true }
    }

    // Stock is sufficient — always allowed
    if (resultingStock >= 0) {
        return { allowed: true, currentStock, requestedQty, resultingStock }
    }

    // Stock would go negative — check config
    const negativeAllowed = await isNegativeStockAllowed(franchiseId, locationId)
    
    if (negativeAllowed) {
        return { allowed: true, currentStock, requestedQty, resultingStock, overrideAllowed: true }
    }

    return {
        allowed: false,
        currentStock,
        requestedQty,
        resultingStock,
        error: `Insufficient stock. Current: ${currentStock}, Requested: ${requestedQty}. Would result in negative stock (${resultingStock}).`,
        overrideAllowed: false
    }
}

/**
 * Check if negative stock is allowed for a franchise/location.
 * Location override takes priority over franchise default.
 */
async function isNegativeStockAllowed(franchiseId: string, locationId?: string): Promise<boolean> {
    // Check location-level override first
    if (locationId) {
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { settings: true }
        })
        const locationSettings = location?.settings as any
        if (locationSettings?.allowNegativeStock !== undefined) {
            return Boolean(locationSettings.allowNegativeStock)
        }
    }

    // Check franchise-level default
    const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { franchisor: { select: { config: true } } }
    })
    const config = franchise?.franchisor?.config as any
    if (config?.allowNegativeStock !== undefined) {
        return Boolean(config.allowNegativeStock)
    }

    // Global default: strict mode (no negative stock)
    return false
}

export default { checkStockAvailable }
