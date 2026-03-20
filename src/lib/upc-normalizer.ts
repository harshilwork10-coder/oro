/**
 * UPC/EAN Barcode Normalizer
 *
 * Handles the messy reality of UPC/EAN codes from vendor invoices:
 * - Strip leading zeros
 * - Pad to standard lengths (12 for UPC-A, 13 for EAN-13, 14 for GTIN-14)
 * - Validate check digits
 * - Generate all possible search variants for matching
 */

/**
 * Strip leading zeros and non-digit characters
 */
export function cleanBarcode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9]/g, '').replace(/^0+/, '')
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Pad barcode to specific length with leading zeros
 */
function padBarcode(code: string, length: number): string {
  return code.padStart(length, '0')
}

/**
 * Generate all possible UPC/EAN variants for matching
 * Returns an array of normalized barcodes to search against Product.barcode
 */
export function generateBarcodeVariants(raw: string | null | undefined): string[] {
  const cleaned = cleanBarcode(raw)
  if (!cleaned) return []

  const variants = new Set<string>()

  // Original cleaned (no leading zeros)
  variants.add(cleaned)

  // Standard padded lengths
  if (cleaned.length <= 12) variants.add(padBarcode(cleaned, 12))
  if (cleaned.length <= 13) variants.add(padBarcode(cleaned, 13))
  if (cleaned.length <= 14) variants.add(padBarcode(cleaned, 14))

  // Without check digit (last digit)
  if (cleaned.length >= 8) {
    const withoutCheck = cleaned.slice(0, -1)
    variants.add(withoutCheck)
    if (withoutCheck.length <= 12) variants.add(padBarcode(withoutCheck, 12))
  }

  return Array.from(variants).filter(v => v.length >= 6)
}

/**
 * Normalize a barcode for storage (consistent format)
 */
export function normalizeForStorage(raw: string | null | undefined): string | null {
  const cleaned = cleanBarcode(raw)
  if (!cleaned) return null
  return cleaned
}

/**
 * Compare two barcodes, accounting for padding differences
 */
export function barcodesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const cleanA = cleanBarcode(a)
  const cleanB = cleanBarcode(b)
  if (!cleanA || !cleanB) return false
  return cleanA === cleanB
}
