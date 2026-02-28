/**
 * Tobacco Scan Data Export — Manufacturer File Generators
 *
 * Generates pipe-delimited (.txt) files for:
 *   - ALTRIA (Marlboro, Copenhagen, IQOS) → Insight C3M / ScanConnect format
 *   - RJR (Camel, Newport, Pall Mall) → Circana format
 *   - ITG (Kool, Winston, Maverick) → Standard pipe format
 *
 * Pack/Carton/Case Logic:
 *   EACH  = 1 single pack (e.g., 1 pack Marlboro Gold KS = 1 unit)
 *   CARTON = 10 packs  → scan data must report as 10 individual pack scans
 *   CASE   = 30 cartons = 300 packs → wholesale, not in scan data
 *
 * Multi-pack: if customer buys 2+ packs in same transaction = multi-pack flag "Y"
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TobaccoScanRecord {
    transactionId: string
    transactionDate: Date
    stationId: string
    productName: string
    upc: string
    category: TobaccoCategory
    manufacturer: string
    unitOfMeasure: TobaccoUOM
    quantitySold: number
    sellingPrice: number   // price per unit (per pack)
    discountAmount: number
    discountDescription: string
    isMultiPack: boolean
    multiPackQty: number
    loyaltyId: string
}

export type TobaccoCategory =
    | 'CIGARETTES'
    | 'SMOKELESS'
    | 'CIGARS'
    | 'VAPOR'
    | 'ROLL_YOUR_OWN'
    | 'NICOTINE_POUCHES'
    | 'OTHER_TOBACCO'

export type TobaccoUOM = 'EACH' | 'PACK' | 'CARTON' | 'CAN' | 'POUCH' | 'ROLL'

export interface StoreInfo {
    accountNumber: string    // Altria Management Account # or RJR Store ID
    storeName: string
    storeAddress: string
    storeCity: string
    storeState: string
    storeZip: string
    storePhone: string
}

// ─── Pack / Carton / Case Expansion ───────────────────────────────────────────

/**
 * Expands carton sales into individual pack records for scan data
 *
 * Example: Customer buys 1 carton of Marlboro Gold ($85.99)
 *   → 10 pack records at $8.599 each (carton price ÷ 10)
 *
 * Case purchases are wholesale and NOT included in consumer scan data
 */
export function expandToPackUnits(record: TobaccoScanRecord): TobaccoScanRecord[] {
    if (record.unitOfMeasure === 'CARTON') {
        const packsPerCarton = 10
        const totalPacks = record.quantitySold * packsPerCarton
        const pricePerPack = Math.round((record.sellingPrice / packsPerCarton) * 100) / 100
        const discountPerPack = Math.round((record.discountAmount / packsPerCarton) * 100) / 100

        return [{
            ...record,
            unitOfMeasure: 'EACH',
            quantitySold: totalPacks,
            sellingPrice: pricePerPack,
            discountAmount: discountPerPack,
            isMultiPack: true,
            multiPackQty: packsPerCarton,
        }]
    }

    // CAN (smokeless) stays as-is
    // EACH/PACK stays as-is
    return [record]
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
}

function fmtTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function fmtPrice(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2)
}

function weekEndingSaturday(d: Date): Date {
    const day = d.getDay()
    const sat = new Date(d)
    sat.setDate(d.getDate() + (6 - day))
    return sat
}

// ─── ALTRIA Format (Insight C3M / ScanConnect) ────────────────────────────────
/**
 * Pipe-delimited TXT file
 *
 * Sections:
 *   FH|  = File Header
 *   SH|  = Store Header
 *   SD|  = Scan Detail (one per item scanned)
 *   SF|  = Store Footer
 *   FF|  = File Footer
 */
export function generateAltriaFile(
    store: StoreInfo,
    records: TobaccoScanRecord[],
    weekEndDate?: Date
): string {
    const weekEnd = weekEndDate || weekEndingSaturday(new Date())
    const expanded = records.flatMap(expandToPackUnits)
    const lines: string[] = []

    // File Header
    lines.push(`FH|${store.accountNumber}|${fmtDate(weekEnd)}|ALTRIA|ORO9POS`)

    // Store Header
    lines.push(`SH|${store.accountNumber}|${store.storeName}|${store.storeAddress}|${store.storeCity}|${store.storeState}|${store.storeZip}`)

    // Scan Detail lines
    for (const rec of expanded) {
        lines.push([
            'SD',
            store.accountNumber,
            fmtDate(weekEnd),
            fmtDate(rec.transactionDate),
            fmtTime(rec.transactionDate),
            `${rec.stationId}-${rec.transactionId}`,  // Transaction ID Code
            rec.stationId,
            rec.upc,
            rec.productName,
            rec.category,
            rec.manufacturer,
            'Each',                                     // Unit of Measure
            String(rec.quantitySold),
            fmtPrice(rec.sellingPrice),
            rec.loyaltyId || '',                        // Loyalty/Alt ID
            rec.isMultiPack ? 'Y' : 'N',                // Multi-Pack Flag
            String(rec.multiPackQty || 0),               // Multi-Pack Qty
            fmtPrice(rec.discountAmount),                // Discount Amount
            rec.discountDescription || '',               // Promotion Description
        ].join('|'))
    }

    // Store Footer
    lines.push(`SF|${store.accountNumber}|${expanded.length}|${fmtPrice(expanded.reduce((s, r) => s + r.sellingPrice * r.quantitySold, 0))}`)

    // File Footer
    lines.push(`FF|${store.accountNumber}|1|${expanded.length}`)

    return lines.join('\r\n')
}

// ─── RJR Format (Circana / formerly MSAi) ─────────────────────────────────────
/**
 * Pipe-delimited, NO headers (raw data lines only)
 *
 * Each line = one scan record
 * Fields: Store|Date|Time|TxnID|ScanID|RegisterID|UPC|Description|PackSize|Qty|Price|MfgDiscount|PromoDesc|MultiPackQty|MultiPackFlag|CouponDept
 */
export function generateRJRFile(
    store: StoreInfo,
    records: TobaccoScanRecord[]
): string {
    const expanded = records.flatMap(expandToPackUnits)
    const lines: string[] = []

    let scanSeq = 1
    for (const rec of expanded) {
        const txnId = `${store.accountNumber}-${rec.transactionId}`
        lines.push([
            store.storeName,
            store.storeAddress,
            store.storeCity,
            store.storeState,
            store.storeZip,
            fmtDate(rec.transactionDate),
            fmtTime(rec.transactionDate),
            txnId,                                          // Market Basket Txn ID
            `${txnId}-${String(scanSeq++).padStart(3, '0')}`,  // Scan Transaction ID
            rec.stationId,                                   // Register ID
            rec.upc,
            rec.productName,
            mapPackSize(rec),                                // Pack Size
            String(rec.quantitySold),
            fmtPrice(rec.sellingPrice),
            fmtPrice(rec.discountAmount),                    // Mfg Discount Amount
            rec.discountDescription || '',                   // Mfg Promotion Desc
            String(rec.multiPackQty || 0),                   // Outlet Multi-Pack Qty
            rec.isMultiPack ? 'Y' : 'N',                     // Multi-Pack Flag
            rec.category === 'CIGARETTES' ? 'TOBACCO-CIG' :  // Coupon Department
                rec.category === 'SMOKELESS' ? 'TOBACCO-SLT' :
                    'TOBACCO-OTP',
        ].join('|'))
    }

    return lines.join('\r\n')
}

// ─── ITG Format (same as RJR but simpler) ─────────────────────────────────────
export function generateITGFile(
    store: StoreInfo,
    records: TobaccoScanRecord[]
): string {
    // ITG uses same Circana/pipe format as RJR
    return generateRJRFile(store, records)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPackSize(rec: TobaccoScanRecord): string {
    switch (rec.unitOfMeasure) {
        case 'EACH':
        case 'PACK':
            return 'PACK'
        case 'CARTON':
            return 'CARTON'  // already expanded to packs but keep label
        case 'CAN':
            return 'CAN'
        case 'POUCH':
            return 'POUCH'
        case 'ROLL':
            return 'ROLL'
        default:
            return 'EACH'
    }
}

/**
 * Detect unit of measure from product name or metadata
 *
 * Convention: product name ending in keywords indicates type
 *   "MARLBORO GOLD KS BOX"    → PACK (single)
 *   "MARLBORO GOLD KS CARTON" → CARTON (10 packs)
 *   "COPENHAGEN LC WINTERGREEN CAN" → CAN
 *   "GRIZZLY POUCHES WINTERGREEN"   → POUCH
 */
export function detectUOM(productName: string, explicitUOM?: string): TobaccoUOM {
    if (explicitUOM) return explicitUOM as TobaccoUOM

    const lower = productName.toLowerCase()
    if (lower.includes('carton')) return 'CARTON'
    if (lower.includes(' can') || lower.includes(' lc ')) return 'CAN'
    if (lower.includes('pouch')) return 'POUCH'
    if (lower.includes('roll')) return 'ROLL'
    return 'EACH'
}

/**
 * Detect tobacco category from product name
 */
export function detectCategory(productName: string): TobaccoCategory {
    const lower = productName.toLowerCase()
    if (lower.includes('cigar') || lower.includes('swisher') || lower.includes('backwood')) return 'CIGARS'
    if (lower.includes('vape') || lower.includes('juul') || lower.includes('vuse') || lower.includes('iqos')) return 'VAPOR'
    if (lower.includes('copenhagen') || lower.includes('grizzly') || lower.includes('skoal') || lower.includes('zyn') || lower.includes('on!')) return 'SMOKELESS'
    if (lower.includes('zyn') || lower.includes('on!') || lower.includes('rogue') || lower.includes('lucy')) return 'NICOTINE_POUCHES'
    if (lower.includes('pipe') || lower.includes('roll your own')) return 'ROLL_YOUR_OWN'
    return 'CIGARETTES'
}

/**
 * Manufacturer detection by brand
 */
const MANUFACTURER_BRANDS: Record<string, string[]> = {
    ALTRIA: [
        'marlboro', 'virginia slims', 'parliament', 'basic', 'l&m', 'chesterfield',
        'copenhagen', 'skoal', 'black & mild', 'iqos', 'on!',
    ],
    RJR: [
        'camel', 'newport', 'pall mall', 'doral', 'natural american spirit',
        'grizzly', 'kodiak', 'vuse',
    ],
    ITG: [
        'kool', 'winston', 'maverick', 'salem', 'usa gold', 'dutch masters',
    ],
}

export function detectManufacturer(productName: string): string {
    const lower = productName.toLowerCase()
    for (const [mfg, brands] of Object.entries(MANUFACTURER_BRANDS)) {
        if (brands.some(b => lower.includes(b))) return mfg
    }
    return 'OTHER'
}
