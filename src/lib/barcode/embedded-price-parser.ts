/**
 * Price-Embedded Barcode Parser
 *
 * Handles UPC-A barcodes that encode price or weight:
 * - Prefix 2 (20-24): Price-embedded (item lookup PLU + embedded price)
 * - Prefix 27-28: Weight-embedded (item lookup PLU + weight for price-per-lb calculation)
 *
 * Standard UPC-A format for price/weight barcodes:
 *   [2][PPPP][CCCCC][K]
 *   - 2: System Number (prefix)
 *   - PPPP: PLU Item Code (4 digits)
 *   - CCCCC: Price (5 digits, $XXX.XX) or Weight (5 digits, XX.XXX lbs)
 *   - K: Check digit
 */

export interface ParsedBarcode {
    type: 'STANDARD' | 'PRICE_EMBEDDED' | 'WEIGHT_EMBEDDED'
    originalBarcode: string
    plu?: string           // 4-5 digit item identifier
    embeddedPrice?: number // Extracted price in dollars
    embeddedWeight?: number // Extracted weight in lbs
    isEmbedded: boolean
}

const PRICE_PREFIXES = ['20', '21', '22', '23', '24']
const WEIGHT_PREFIXES = ['27', '28']

export function parseEmbeddedBarcode(barcode: string): ParsedBarcode {
    // Must be exactly 12 or 13 digits (UPC-A or EAN-13)
    const cleaned = barcode.replace(/\D/g, '')

    if (cleaned.length < 12 || cleaned.length > 13) {
        return { type: 'STANDARD', originalBarcode: barcode, isEmbedded: false }
    }

    const prefix = cleaned.substring(0, 2)

    // Price-embedded barcodes
    if (PRICE_PREFIXES.includes(prefix)) {
        const plu = cleaned.substring(2, 7)     // 5-digit PLU
        const priceStr = cleaned.substring(7, 12) // 5-digit price
        const embeddedPrice = parseInt(priceStr, 10) / 100 // Convert cents to dollars

        return {
            type: 'PRICE_EMBEDDED',
            originalBarcode: barcode,
            plu,
            embeddedPrice,
            isEmbedded: true
        }
    }

    // Weight-embedded barcodes
    if (WEIGHT_PREFIXES.includes(prefix)) {
        const plu = cleaned.substring(2, 7)      // 5-digit PLU
        const weightStr = cleaned.substring(7, 12) // 5-digit weight
        const embeddedWeight = parseInt(weightStr, 10) / 1000 // Convert to lbs (XX.XXX)

        return {
            type: 'WEIGHT_EMBEDDED',
            originalBarcode: barcode,
            plu,
            embeddedWeight,
            isEmbedded: true
        }
    }

    return { type: 'STANDARD', originalBarcode: barcode, isEmbedded: false }
}

/**
 * Calculate price for a weight-embedded barcode
 */
export function calculateWeightPrice(weight: number, pricePerLb: number): number {
    return Math.round(weight * pricePerLb * 100) / 100
}

/**
 * Check if a barcode is a price/weight embedded type
 */
export function isEmbeddedBarcode(barcode: string): boolean {
    const cleaned = barcode.replace(/\D/g, '')
    if (cleaned.length < 12) return false
    const prefix = cleaned.substring(0, 2)
    return PRICE_PREFIXES.includes(prefix) || WEIGHT_PREFIXES.includes(prefix)
}
