/**
 * Price-Embedded Barcode Parser
 * 
 * Supports industry-standard price-embedded barcode formats:
 * - Format 2: 2PPPPP CCCCC C (5-digit price, UPC-A)
 * - Format 27: 27XXXX PPPPP C (4-digit item code, 5-digit price)
 * - Format 28: 28XXXX PPPPP C (4-digit item code, 5-digit price)
 * - Format 02: 02XXXXX PPPPP C (5-digit item code, 5-digit price, EAN-13)
 * - Weight-embedded: 2PPPPP WWWWW C (weight instead of price)
 */

export interface PriceEmbeddedResult {
    type: 'price' | 'weight'
    itemCode: string
    value: number // Price in dollars or weight in measurement unit
    originalBarcode: string
    isEmbedded: boolean
}

/**
 * Check if a barcode is price/weight-embedded and parse it
 */
export function parsePriceEmbeddedBarcode(barcode: string): PriceEmbeddedResult | null {
    if (!barcode) return null
    const clean = barcode.replace(/\s/g, '')

    // UPC-A: 12 digits starting with 2
    if (clean.length === 12 && clean[0] === '2') {
        return parseUPCA(clean)
    }

    // EAN-13: 13 digits starting with 02
    if (clean.length === 13 && clean.startsWith('02')) {
        return parseEAN13(clean)
    }

    return null
}

function parseUPCA(barcode: string): PriceEmbeddedResult | null {
    const prefix = barcode.substring(0, 2)
    
    // Format 2X: X = 0-5 typically for in-store use
    // 2XPPPP PPPPP C — digits 2-6 = item code, digits 7-11 = price in cents
    const itemCode = barcode.substring(1, 6) // 5-digit internal item code (PLU)
    const priceDigits = barcode.substring(6, 11)
    const priceInCents = parseInt(priceDigits, 10)

    if (isNaN(priceInCents)) return null

    // Determine if price or weight based on prefix convention
    // 20-21: Random-weight items (price embedded)
    // 22-25: Random-weight items (varying conventions)
    // 26-29: Reserved
    const numPrefix = parseInt(prefix, 10)
    const isWeight = numPrefix >= 22 && numPrefix <= 25

    return {
        type: isWeight ? 'weight' : 'price',
        itemCode: itemCode,
        value: priceInCents / 100, // Dollars or lbs
        originalBarcode: barcode,
        isEmbedded: true
    }
}

function parseEAN13(barcode: string): PriceEmbeddedResult | null {
    // EAN-13 format: 02XXXXX PPPPP C
    // digits 2-6: item code (5 digits)
    // digits 7-11: price in cents (5 digits)
    const itemCode = barcode.substring(2, 7)
    const priceDigits = barcode.substring(7, 12)
    const priceInCents = parseInt(priceDigits, 10)

    if (isNaN(priceInCents)) return null

    return {
        type: 'price',
        itemCode: itemCode,
        value: priceInCents / 100,
        originalBarcode: barcode,
        isEmbedded: true
    }
}

/**
 * Quick check: Is this barcode potentially price-embedded?
 */
export function isPriceEmbedded(barcode: string): boolean {
    if (!barcode) return false
    const clean = barcode.replace(/\s/g, '')
    return (clean.length === 12 && clean[0] === '2') ||
           (clean.length === 13 && clean.startsWith('02'))
}

export default { parsePriceEmbeddedBarcode, isPriceEmbedded }
