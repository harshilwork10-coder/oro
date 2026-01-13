/**
 * AI SKU Database - UPC/Barcode Lookup Service
 * 
 * Priority Order:
 * 1) Oro shared database (crowdsourced from all merchants - fastest)
 * 2) Open Food Facts API (free, no API key)
 * 3) UPC ItemDB API (general products)
 */

import { prisma } from '@/lib/prisma'

export interface SKULookupResult {
    found: boolean
    barcode: string
    name?: string
    brand?: string
    category?: string
    description?: string
    imageUrl?: string
    suggestedPrice?: number
    size?: string  // e.g., "12 oz", "2 Liter", "6 Pack"
    source?: 'Oro_database' | 'barcode_spider' | 'open_food_facts' | 'upc_database' | 'upc_itemdb'
}

interface OpenFoodFactsProduct {
    product_name?: string
    brands?: string
    categories?: string
    image_url?: string
    generic_name?: string
    quantity?: string  // Size/volume from OFF
    serving_size?: string
}

interface UPCItemDBProduct {
    title?: string
    brand?: string
    category?: string
    images?: string[]
    description?: string
    lowest_recorded_price?: number
    size?: string
}

/**
 * Extract size/volume from product name or description
 * Handles: "12 oz", "2 Liter", "16.9 fl oz", "6 Pack", "750ml", etc.
 */
function extractSize(text: string): string | undefined {
    if (!text) return undefined

    // Common size patterns
    const patterns = [
        // Fluid ounces: "12 oz", "16.9 fl oz", "20oz"
        /(\d+\.?\d*)\s*(fl\.?\s*)?oz\.?/i,
        // Liters: "2 Liter", "1.5L", "500ml"
        /(\d+\.?\d*)\s*(liter|litre|lt|l)\b/i,
        /(\d+\.?\d*)\s*ml\b/i,
        // Gallons: "1 gallon", "1/2 gal"
        /(\d+\.?\d*|\d+\/\d+)\s*gal(lon)?s?\b/i,
        // Packs: "6 Pack", "12-pack", "24 pk"
        /(\d+)\s*(-|\s)?(pack|pk)\b/i,
        // Count: "100 count", "50 ct"
        /(\d+)\s*(count|ct)\b/i,
        // Pounds/ounces (weight): "1 lb", "8 oz"
        /(\d+\.?\d*)\s*lb\.?s?\b/i,
        // Grams: "100g", "250 grams"
        /(\d+\.?\d*)\s*(g|grams?)\b/i,
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            // Clean up the matched size
            let size = match[0].trim()
            // Normalize common formats
            size = size.replace(/\s+/g, ' ')
            return size
        }
    }

    return undefined
}

/**
 * Oro Shared Database Lookup - Crowdsourced from all merchants
 * This is checked FIRST because it's the fastest and gets more accurate over time
 */
async function lookupOroDatabase(barcode: string): Promise<SKULookupResult> {
    const product = await prisma.sharedUPCProduct.findUnique({
        where: { barcode }
    })

    if (!product) {
        return { found: false, barcode }
    }

    return {
        found: true,
        barcode,
        name: product.name,
        brand: product.brand || undefined,
        category: product.category || undefined,
        description: product.description || undefined,
        imageUrl: product.imageUrl || undefined,
        suggestedPrice: product.avgPrice ? Number(product.avgPrice) : undefined,
        size: product.size || undefined,
        source: 'Oro_database'
    }
}

/**
 * Save product data to the Oro shared database
 * Called when a merchant adds a new product to contribute to the crowdsourced pool
 */
export async function saveToOroDatabase(data: {
    barcode: string
    name: string
    brand?: string
    category?: string
    description?: string
    size?: string
    imageUrl?: string
    price?: number
    userId?: string
    franchiseId?: string
    source?: string
}): Promise<void> {
    try {
        // Check if this barcode already exists
        const existing = await prisma.sharedUPCProduct.findUnique({
            where: { barcode: data.barcode }
        })

        if (existing) {
            // Update contributor count and verify the data
            await prisma.sharedUPCProduct.update({
                where: { barcode: data.barcode },
                data: {
                    contributorCount: existing.contributorCount + 1,
                    lastVerifiedAt: new Date(),
                    // If we have new info that was missing, add it
                    brand: existing.brand || data.brand,
                    category: existing.category || data.category,
                    size: existing.size || data.size,
                    imageUrl: existing.imageUrl || data.imageUrl
                }
            })
        } else {
            // Create new entry
            await prisma.sharedUPCProduct.create({
                data: {
                    barcode: data.barcode,
                    name: data.name,
                    brand: data.brand,
                    category: data.category,
                    description: data.description,
                    size: data.size,
                    imageUrl: data.imageUrl,
                    avgPrice: data.price,
                    originalSource: data.source || 'merchant',
                    contributedByUserId: data.userId,
                    contributedByFranchiseId: data.franchiseId,
                    contributorCount: 1
                }
            })
        }
    } catch (error) {
        console.error('[Oro_DB] Failed to save product:', error)
        // Don't throw - this is a background enhancement, not critical path
    }
}

/**
 * Timeout wrapper for fetch calls
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(url, { ...options, signal: controller.signal })
        return response
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Main lookup function - tries multiple sources with timeout
 * Priority: 1) Oro shared database (fastest, crowdsourced)
 *           2) Barcode Spider (500M-1.5B products, good for alcohol)
 *           3) Open Food Facts (free API)
 *           4) UPC ItemDB (general products)
 * 
 * IMPORTANT: Each source has a 3s timeout, total max is ~5s to prevent UI hanging
 */
export async function lookupBarcode(barcode: string): Promise<SKULookupResult> {
    // Clean the barcode
    const cleanBarcode = barcode.replace(/[^0-9]/g, '')

    if (!cleanBarcode || cleanBarcode.length < 8) {
        return { found: false, barcode: cleanBarcode }
    }

    let result: SKULookupResult = { found: false, barcode: cleanBarcode }

    // Create a master timeout that cancels the entire lookup after 15 seconds
    const masterTimeout = new Promise<SKULookupResult>((resolve) => {
        setTimeout(() => {
            resolve({ found: false, barcode: cleanBarcode })
        }, 15000)
    })

    // The actual lookup logic
    const doLookup = async (): Promise<SKULookupResult> => {
        // Try Oro shared database first (fastest, crowdsourced data)
        try {
            const oroResult = await lookupOroDatabase(cleanBarcode)
            if (oroResult.found) return applyBrandCategoryCorrection(oroResult)
        } catch {
            // Oro database check failed, continue to next source
        }

        // Try Barcode Spider (500M-1.5B products, good coverage)
        try {
            const spiderResult = await lookupBarcodeSpider(cleanBarcode)
            if (spiderResult.found) return applyBrandCategoryCorrection(spiderResult)
        } catch {
            // Barcode Spider failed, continue to next source
        }

        // Try Open Food Facts (great for food/beverages)
        try {
            const offResult = await lookupOpenFoodFacts(cleanBarcode)
            if (offResult.found) return applyBrandCategoryCorrection(offResult)
        } catch {
            // Open Food Facts failed, continue to next source
        }

        // Try UPC ItemDB (general products)
        try {
            const upcResult = await lookupUPCItemDB(cleanBarcode)
            if (upcResult.found) return applyBrandCategoryCorrection(upcResult)
        } catch {
            // UPC ItemDB failed, no more sources
        }

        return { found: false, barcode: cleanBarcode }
    }

    // Race between actual lookup and timeout
    result = await Promise.race([doLookup(), masterTimeout])

    return result
}

/**
 * Apply brand-based category corrections
 * External APIs sometimes return wrong categories for well-known brands
 */
function applyBrandCategoryCorrection(result: SKULookupResult): SKULookupResult {
    const nameUpper = (result.name || '').toUpperCase()
    const brandUpper = (result.brand || '').toUpperCase()

    // Tobacco brands - should NEVER be in food/drinks categories
    const tobaccoBrands = [
        'MARLBORO', 'CAMEL', 'NEWPORT', 'PALL MALL', 'WINSTON', 'KOOL',
        'PARLIAMENT', 'VIRGINIA SLIMS', 'NATURAL AMERICAN SPIRIT', 'AMERICAN SPIRIT',
        'LUCKY STRIKE', 'L&M', 'MAVERICK', 'BASIC', 'DORAL', 'MISTY',
        'SALEM', 'CAPRI', 'BENSON & HEDGES', 'CARLTON', 'KENT',
        'GRIZZLY', 'COPENHAGEN', 'SKOAL', 'KODIAK', 'LONGHORN', 'TIMBER WOLF',
        'SWISHER', 'BLACK & MILD', 'BACKWOODS', 'DUTCH MASTERS', 'GAME',
        'WHITE OWL', 'OPTIMO', 'PHILLIES', 'ZIG ZAG', 'RAW', 'JUUL', 'VUSE', 'NJOY'
    ]

    for (const brand of tobaccoBrands) {
        if (nameUpper.includes(brand) || brandUpper.includes(brand)) {
            return {
                ...result,
                category: 'Tobacco'
            }
        }
    }

    // Alcohol brands - should be in Alcohol/Beer/Wine categories
    const alcoholBrands = [
        'BUDWEISER', 'BUD LIGHT', 'MILLER', 'COORS', 'CORONA', 'HEINEKEN',
        'MODELO', 'MICHELOB', 'NATURAL LIGHT', 'BUSCH', 'KEYSTONE',
        'JACK DANIELS', 'JIM BEAM', 'FIREBALL', 'JOSE CUERVO', 'SMIRNOFF',
        'ABSOLUT', 'GREY GOOSE', 'HENNESSY', 'BACARDI', 'CAPTAIN MORGAN',
        'WHITE CLAW', 'TRULY', 'BON & VIV', 'TOPO CHICO HARD SELTZER'
    ]

    for (const brand of alcoholBrands) {
        if (nameUpper.includes(brand) || brandUpper.includes(brand)) {
            if (result.category !== 'Alcohol' && result.category !== 'Beer' && result.category !== 'Wine' && result.category !== 'Spirits') {
                return {
                    ...result,
                    category: 'Alcohol'
                }
            }
        }
    }

    return result
}

/**
 * Barcode Spider API - Large database (500M-1.5B products)
 * Good for alcohol and general products
 */
async function lookupBarcodeSpider(barcode: string): Promise<SKULookupResult> {
    const url = `https://api.barcodespider.com/v1/lookup?upc=${barcode}`

    const response = await fetchWithTimeout(url, {
        headers: {
            'Accept': 'application/json',
            // Free tier doesn't require API key for basic lookup
        }
    }, 5000)

    if (!response.ok) {
        throw new Error(`Barcode Spider API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.item_response || !data.item_response.items?.length) {
        return { found: false, barcode }
    }

    const item = data.item_response.items[0]

    // Extract size from title or description
    let size = extractSize(item.title || '')
    if (!size && item.description) {
        size = extractSize(item.description)
    }

    return {
        found: true,
        barcode,
        name: item.title,
        brand: item.brand,
        category: item.category,
        description: item.description,
        imageUrl: item.images?.[0],
        suggestedPrice: item.lowest_recorded_price || item.highest_recorded_price,
        size,
        source: 'barcode_spider' as const
    }
}

/**
 * Open Food Facts API - Free, no API key needed
 * Great for food, beverages, cosmetics
 */
async function lookupOpenFoodFacts(barcode: string): Promise<SKULookupResult> {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`

    const response = await fetchWithTimeout(url, {
        headers: {
            'User-Agent': 'OroPOS/1.0 (contact@oronex.com)'
        }
    }, 5000)

    if (!response.ok) {
        throw new Error(`OFF API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 1 || !data.product) {
        return { found: false, barcode }
    }

    const product: OpenFoodFactsProduct = data.product

    // Parse category from hierarchical format
    let category = ''
    if (product.categories) {
        const cats = product.categories.split(',')
        category = cats[cats.length - 1]?.trim() || ''
    }

    // Get size from quantity field, or extract from name
    let size = product.quantity || product.serving_size
    if (!size && product.product_name) {
        size = extractSize(product.product_name)
    }
    if (!size && product.generic_name) {
        size = extractSize(product.generic_name)
    }

    return {
        found: true,
        barcode,
        name: product.product_name || product.generic_name || '',
        brand: product.brands?.split(',')[0]?.trim() || '',
        category,
        description: product.generic_name || '',
        imageUrl: product.image_url || '',
        size,
        source: 'open_food_facts'
    }
}

/**
 * UPC ItemDB API - General products database
 * Limited free tier but covers non-food items
 */
async function lookupUPCItemDB(barcode: string): Promise<SKULookupResult> {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`

    const response = await fetchWithTimeout(url, {
        headers: {
            'Accept': 'application/json'
        }
    }, 5000)

    if (!response.ok) {
        throw new Error(`UPC ItemDB error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
        return { found: false, barcode }
    }

    const product: UPCItemDBProduct = data.items[0]

    // Get size from product or extract from title/description
    let size = product.size
    if (!size && product.title) {
        size = extractSize(product.title)
    }
    if (!size && product.description) {
        size = extractSize(product.description)
    }

    return {
        found: true,
        barcode,
        name: product.title || '',
        brand: product.brand || '',
        category: product.category || '',
        description: product.description || '',
        imageUrl: product.images?.[0] || '',
        suggestedPrice: product.lowest_recorded_price,
        size,
        source: 'upc_itemdb'
    }
}

/**
 * Suggest a retail price based on cost and category margins
 */
export function suggestRetailPrice(cost: number, category?: string): number {
    // Category-based margin targets
    const marginTargets: Record<string, number> = {
        'beverages': 0.35,
        'snacks': 0.40,
        'candy': 0.45,
        'tobacco': 0.15,
        'alcohol': 0.25,
        'grocery': 0.30,
        'dairy': 0.25,
        'frozen': 0.30,
        'household': 0.35,
        'default': 0.30
    }

    const lowerCategory = (category || '').toLowerCase()
    let margin = marginTargets.default

    for (const [key, value] of Object.entries(marginTargets)) {
        if (lowerCategory.includes(key)) {
            margin = value
            break
        }
    }

    // Calculate price: cost / (1 - margin)
    const suggestedPrice = cost / (1 - margin)

    // Round to .X9 pricing (psychological pricing)
    return Math.ceil(suggestedPrice * 10) / 10 - 0.01
}

/**
 * Get common retail categories for dropdown
 */
export function getRetailCategories(): string[] {
    return [
        'Beverages',
        'Snacks',
        'Candy',
        'Tobacco',
        'Alcohol - Beer',
        'Alcohol - Wine',
        'Alcohol - Spirits',
        'Grocery',
        'Dairy',
        'Frozen',
        'Household',
        'Health & Beauty',
        'Lottery',
        'Vape & E-Cig',
        'Other'
    ]
}


