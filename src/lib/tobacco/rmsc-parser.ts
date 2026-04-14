/**
 * RMSC 34-Field Tobacco Scan Data Parser
 *
 * Parses industry-standard tobacco scan export files in two formats:
 * 1. Pipe-delimited TXT (real POS exports: BigLake, SmokeForLess)
 * 2. CSV (RMSC reference templates: MultiPack.csv, Loyalty_Vapor.csv)
 *
 * Produces typed RmscRow objects that map 1:1 to TobaccoScanEvent fields.
 */

import { createHash } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────

export type LineType =
  | 'NORMAL_SALE'
  | 'MFG_MULTIPACK'
  | 'OUTLET_MULTIPACK'
  | 'CO_FUNDED_MULTIPACK'
  | 'PROMO_UPC'
  | 'VAP_SALE'
  | 'JBF_SALE'
  | 'COUPON_SALE'
  | 'LOYALTY_OFFER'
  | 'RETURN'
  | 'EXCHANGE'

export type UnitOfMeasure = 'PACK' | 'CARTON' | 'CAN' | 'ROLL' | 'TIN' | 'SLEEVE'

export interface RmscRow {
  // Store identity (fields 1-7)
  outletName: string
  outletNumber: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string

  // Transaction identity (fields 8-12)
  transactionDate: string  // YYYY-MM-DD-HH:MM:SS
  marketBasketId: string   // Transaction number
  scanId: number           // Line position in transaction
  registerId: string
  quantity: number          // SIGNED — negative for returns

  // Product (fields 13-16)
  price: number             // Per-unit selling price (post-discount)
  upcCode: string           // 14-digit zero-padded UPC
  upcDescription: string
  unitOfMeasure: UnitOfMeasure

  // Promo flag (field 17)
  promoFlag: boolean

  // Channel 1: Outlet multipack (fields 18-20)
  outletMultipackFlag: boolean
  outletMultipackQty: number | null
  outletMultipackDiscAmt: number

  // Channel 2: Account promo (fields 21-22)
  acctPromoName: string
  acctDiscAmt: number

  // Channel 3: Mfg discount (field 23)
  mfgDiscAmt: number

  // Channel 4: PID coupon (fields 24-25)
  pidCoupon: string
  pidCouponDisc: number

  // Channel 5: Mfg multipack (fields 26-28)
  mfgMultipackFlag: boolean
  mfgMultipackQty: number | null
  mfgMultipackDiscAmt: number

  // Channel 6: Mfg promo + buydown (fields 29-31)
  mfgPromoDesc: string
  mfgBuydownDesc: string
  mfgBuydownAmt: number

  // Channel 7: Multipack desc + loyalty (fields 32-34)
  mfgMultipackDesc: string
  loyaltyId: string         // Raw value from file (hash separately)
  loyaltyStatus: 'NONE' | 'PRESENT' | 'REQUIRED_MISSING'
  couponDesc: string        // Offer code

  // Derived
  lineType: LineType
  isPromoUpc: boolean
  claimEligible: boolean
  exclusionReason: string | null
}

export interface ParseResult {
  rows: RmscRow[]
  format: 'PIPE' | 'CSV'
  errors: { line: number; message: string }[]
  stats: {
    totalLines: number
    dataLines: number
    normalSales: number
    promoSales: number
    returns: number
    promoUpcLines: number
  }
}

// ─── Format Detection ────────────────────────────────────────────────

export function detectFormat(content: string): 'PIPE' | 'CSV' {
  const firstLine = content.split('\n')[0]?.trim() || ''
  // Pipe-delimited files have store name as first field, many pipes
  if (firstLine.split('|').length >= 30) return 'PIPE'
  return 'CSV'
}

// ─── Parse Helpers ───────────────────────────────────────────────────

function parseNum(val: string | undefined): number {
  if (!val || val.trim() === '') return 0
  const n = parseFloat(val.trim())
  return isNaN(n) ? 0 : n
}

function parseInt2(val: string | undefined): number {
  if (!val || val.trim() === '') return 0
  const n = parseInt(val.trim(), 10)
  return isNaN(n) ? 0 : n
}

function parseBool(val: string | undefined): boolean {
  return val?.trim()?.toUpperCase() === 'Y'
}

function normalizeUOM(val: string | undefined): UnitOfMeasure {
  const v = (val || '').trim().toUpperCase()
  switch (v) {
    case 'PACK': case 'PACK ': return 'PACK'
    case 'CARTON': return 'CARTON'
    case 'CAN': return 'CAN'
    case 'ROLL': return 'ROLL'
    case 'TIN': return 'TIN'
    case 'SLEEVE': return 'SLEEVE'
    default: return 'PACK'
  }
}

// ─── Line Type Classifier ─────────────────────────────────────────

const PROMO_UPC_REGEX = /\$\d+\.?\d*\s*OFF/i

export function classifyLine(row: Partial<RmscRow>): LineType {
  // Returns first
  if ((row.quantity || 0) < 0) return 'RETURN'

  // Promo UPC detection
  if (row.upcDescription && PROMO_UPC_REGEX.test(row.upcDescription)) return 'PROMO_UPC'

  const hasMfgMP = row.mfgMultipackFlag === true
  const hasOutletMP = row.outletMultipackFlag === true

  if (hasMfgMP && hasOutletMP) return 'CO_FUNDED_MULTIPACK'
  if (hasMfgMP) return 'MFG_MULTIPACK'
  if (hasOutletMP) return 'OUTLET_MULTIPACK'

  if ((row.mfgDiscAmt || 0) > 0) {
    const desc = (row.mfgPromoDesc || '').toUpperCase()
    if (desc.includes('VAP')) return 'VAP_SALE'
    if (/JBF|B\dS/i.test(desc)) return 'JBF_SALE'
  }

  if (row.pidCoupon && row.pidCoupon.trim() !== '') return 'COUPON_SALE'
  if (row.loyaltyId && (row.pidCouponDisc || 0) > 0) return 'LOYALTY_OFFER'

  return 'NORMAL_SALE'
}

// ─── Claim Eligibility ────────────────────────────────────────────

function resolveClaimEligibility(lineType: LineType): { claimEligible: boolean; exclusionReason: string | null } {
  switch (lineType) {
    case 'PROMO_UPC':
      return { claimEligible: false, exclusionReason: 'PROMO_UPC_PREPRICED' }
    case 'RETURN':
      return { claimEligible: false, exclusionReason: 'RETURN_VOID' }
    case 'EXCHANGE':
      return { claimEligible: false, exclusionReason: 'EXCHANGE_RETURN' }
    default:
      return { claimEligible: true, exclusionReason: null }
  }
}

// ─── Loyalty ID Hashing ───────────────────────────────────────────

export function hashLoyaltyId(rawId: string): string {
  if (!rawId || rawId.trim() === '') return ''
  return createHash('sha256').update(rawId.trim()).digest('hex').substring(0, 20).toUpperCase()
}

/** Resolve loyalty status from parsed data. REQUIRED_MISSING is set at record-event time. */
function resolveLoyaltyStatus(loyaltyId: string): 'NONE' | 'PRESENT' {
  return loyaltyId && loyaltyId.trim() !== '' ? 'PRESENT' : 'NONE'
}

// ─── Pipe-Delimited Parser (BigLake/SmokeForLess) ─────────────────

function parsePipeLine(line: string, lineNum: number): RmscRow | null {
  const fields = line.split('|')
  if (fields.length < 15) return null // Not enough fields

  // Validate: UPC should be numeric-ish, price should be a number
  const upc = (fields[13] || '').trim()
  const price = parseNum(fields[12])
  const qty = parseInt2(fields[11])

  if (!upc || upc.length < 5) return null
  if (qty === 0) return null

  const row: Partial<RmscRow> = {
    outletName: (fields[0] || '').trim(),
    outletNumber: (fields[1] || '').trim(),
    address1: (fields[2] || '').trim(),
    address2: (fields[3] || '').trim(),
    city: (fields[4] || '').trim(),
    state: (fields[5] || '').trim(),
    zip: (fields[6] || '').trim(),
    transactionDate: (fields[7] || '').trim(),
    marketBasketId: (fields[8] || '').trim(),
    scanId: parseInt2(fields[9]),
    registerId: (fields[10] || '').trim(),
    quantity: qty,
    price,
    upcCode: upc,
    upcDescription: (fields[14] || '').trim(),
    unitOfMeasure: normalizeUOM(fields[15]),
    promoFlag: parseBool(fields[16]),
    outletMultipackFlag: parseBool(fields[17]),
    outletMultipackQty: fields[18]?.trim() ? parseInt2(fields[18]) : null,
    outletMultipackDiscAmt: parseNum(fields[19]),
    acctPromoName: (fields[20] || '').trim(),
    acctDiscAmt: parseNum(fields[21]),
    mfgDiscAmt: parseNum(fields[22]),
    pidCoupon: (fields[23] || '').trim(),
    pidCouponDisc: parseNum(fields[24]),
    mfgMultipackFlag: parseBool(fields[25]),
    mfgMultipackQty: fields[26]?.trim() ? parseInt2(fields[26]) : null,
    mfgMultipackDiscAmt: parseNum(fields[27]),
    mfgPromoDesc: (fields[28] || '').trim(),
    mfgBuydownDesc: (fields[29] || '').trim(),
    mfgBuydownAmt: parseNum(fields[30]),
    mfgMultipackDesc: (fields[31] || '').trim(),
    loyaltyId: (fields[32] || '').trim(),
    couponDesc: (fields[33] || '').trim(),
  }

  const lineType = classifyLine(row)
  const isPromoUpc = PROMO_UPC_REGEX.test(row.upcDescription || '')
  const { claimEligible, exclusionReason } = resolveClaimEligibility(lineType)

  return {
    ...row,
    lineType,
    isPromoUpc,
    claimEligible,
    exclusionReason,
    loyaltyStatus: resolveLoyaltyStatus(row.loyaltyId || ''),
  } as RmscRow
}

// ─── CSV Parser (RMSC reference templates) ────────────────────────

function parseCsvLine(fields: string[], lineNum: number): RmscRow | null {
  // RMSC CSV has 2 metadata columns before the 34 fields
  // So fields[2] = Outlet Name (RMSC field 1), fields[35] = Coupon Desc (RMSC field 34)
  const offset = 2

  const upc = (fields[offset + 13] || '').trim()
  const price = parseNum(fields[offset + 12])
  const qty = parseInt2(fields[offset + 11])

  if (!upc || upc.length < 5) return null
  if (qty === 0) return null

  const row: Partial<RmscRow> = {
    outletName: (fields[offset + 0] || '').trim(),
    outletNumber: (fields[offset + 1] || '').trim(),
    address1: (fields[offset + 2] || '').trim(),
    address2: (fields[offset + 3] || '').trim(),
    city: (fields[offset + 4] || '').trim(),
    state: (fields[offset + 5] || '').trim(),
    zip: (fields[offset + 6] || '').trim(),
    transactionDate: (fields[offset + 7] || '').trim(),
    marketBasketId: (fields[offset + 8] || '').trim(),
    scanId: parseInt2(fields[offset + 9]),
    registerId: (fields[offset + 10] || '').trim(),
    quantity: qty,
    price,
    upcCode: upc,
    upcDescription: (fields[offset + 14] || '').trim(),
    unitOfMeasure: normalizeUOM(fields[offset + 15]),
    promoFlag: parseBool(fields[offset + 16]),
    outletMultipackFlag: parseBool(fields[offset + 17]),
    outletMultipackQty: fields[offset + 18]?.trim() ? parseInt2(fields[offset + 18]) : null,
    outletMultipackDiscAmt: parseNum(fields[offset + 19]),
    acctPromoName: (fields[offset + 20] || '').trim(),
    acctDiscAmt: parseNum(fields[offset + 21]),
    mfgDiscAmt: parseNum(fields[offset + 22]),
    pidCoupon: (fields[offset + 23] || '').trim(),
    pidCouponDisc: parseNum(fields[offset + 24]),
    mfgMultipackFlag: parseBool(fields[offset + 25]),
    mfgMultipackQty: fields[offset + 26]?.trim() ? parseInt2(fields[offset + 26]) : null,
    mfgMultipackDiscAmt: parseNum(fields[offset + 27]),
    mfgPromoDesc: (fields[offset + 28] || '').trim(),
    mfgBuydownDesc: (fields[offset + 29] || '').trim(),
    mfgBuydownAmt: parseNum(fields[offset + 30]),
    mfgMultipackDesc: (fields[offset + 31] || '').trim(),
    loyaltyId: (fields[offset + 32] || '').trim(),
    couponDesc: (fields[offset + 33] || '').trim(),
  }

  const lineType = classifyLine(row)
  const isPromoUpc = PROMO_UPC_REGEX.test(row.upcDescription || '')
  const { claimEligible, exclusionReason } = resolveClaimEligibility(lineType)

  return {
    ...row,
    lineType,
    isPromoUpc,
    claimEligible,
    exclusionReason,
    loyaltyStatus: resolveLoyaltyStatus(row.loyaltyId || ''),
  } as RmscRow
}

// ─── CSV Parser: handles quoted fields with embedded commas/newlines ─

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ─── Exchange Detection ───────────────────────────────────────────

function detectExchanges(rows: RmscRow[]): RmscRow[] {
  // Group by market basket
  const baskets = new Map<string, RmscRow[]>()
  for (const row of rows) {
    const existing = baskets.get(row.marketBasketId) || []
    existing.push(row)
    baskets.set(row.marketBasketId, existing)
  }

  for (const [, basketRows] of baskets) {
    const returns = basketRows.filter(r => r.quantity < 0)
    const sales = basketRows.filter(r => r.quantity > 0)

    if (returns.length === 0) continue

    for (const ret of returns) {
      // Check if same UPC exists as a positive line = VOID pair
      const matchingSale = sales.find(s => s.upcCode === ret.upcCode)
      if (matchingSale) {
        // Both are void pairs — mark both as non-claimable
        ret.lineType = 'RETURN'
        ret.claimEligible = false
        ret.exclusionReason = 'RETURN_VOID'
        matchingSale.claimEligible = false
        matchingSale.exclusionReason = 'RETURN_VOID'
        matchingSale.lineType = 'RETURN' // Mark the sale side too
      } else {
        // Different UPC return in same basket = exchange
        ret.lineType = 'EXCHANGE'
        ret.claimEligible = false
        ret.exclusionReason = 'EXCHANGE_RETURN'
      }
    }
  }

  return rows
}

// ─── Main Parse Function ──────────────────────────────────────────

export function parseRmscFile(content: string): ParseResult {
  const format = detectFormat(content)
  const rows: RmscRow[] = []
  const errors: { line: number; message: string }[] = []

  const lines = content.split('\n')
  let totalLines = 0
  let dataLines = 0

  if (format === 'PIPE') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      totalLines++
      if (!line || line.length < 20) continue

      try {
        const row = parsePipeLine(line, i + 1)
        if (row) {
          rows.push(row)
          dataLines++
        }
      } catch (err) {
        errors.push({ line: i + 1, message: `Parse error: ${err}` })
      }
    }
  } else {
    // CSV: handle multiline quoted fields
    const fullContent = content
    // Rejoin lines that are inside quotes
    const csvLines: string[] = []
    let accumulated = ''
    let inQuote = false

    for (const line of lines) {
      accumulated += (accumulated ? '\n' : '') + line
      // Count unescaped quotes
      for (const ch of line) {
        if (ch === '"') inQuote = !inQuote
      }
      if (!inQuote) {
        csvLines.push(accumulated)
        accumulated = ''
      }
    }
    if (accumulated) csvLines.push(accumulated)

    for (let i = 0; i < csvLines.length; i++) {
      const line = csvLines[i].trim()
      totalLines++

      if (!line) continue

      // Skip header rows
      if (line.startsWith(',UPDATED') || line.startsWith(',FIELD') ||
          line.startsWith('Scenario') || line.startsWith('RMSC') ||
          line.startsWith(' Reporting') || /^"?PRICE/.test(line) ||
          /^"?Discounts/.test(line) || /^"?Currently/.test(line) ||
          /^"?All RMSC/.test(line) || /^"?LOYALTY/.test(line) ||
          /^"?RMSC does NOT/.test(line) || /^"?Promotions MUST/.test(line) ||
          line.startsWith('Stacked Program')) continue

      // Skip empty data rows (all commas)
      if (/^[,\s]+$/.test(line)) continue

      const fields = splitCsvLine(line)
      if (fields.length < 20) continue

      try {
        const row = parseCsvLine(fields, i + 1)
        if (row) {
          rows.push(row)
          dataLines++
        }
      } catch (err) {
        errors.push({ line: i + 1, message: `Parse error: ${err}` })
      }
    }
  }

  // Post-process: detect exchanges within market baskets
  const processedRows = detectExchanges(rows)

  // Stats
  const stats = {
    totalLines,
    dataLines,
    normalSales: processedRows.filter(r => r.lineType === 'NORMAL_SALE').length,
    promoSales: processedRows.filter(r =>
      ['MFG_MULTIPACK', 'OUTLET_MULTIPACK', 'CO_FUNDED_MULTIPACK',
       'VAP_SALE', 'JBF_SALE', 'COUPON_SALE', 'LOYALTY_OFFER'].includes(r.lineType)
    ).length,
    returns: processedRows.filter(r => r.quantity < 0).length,
    promoUpcLines: processedRows.filter(r => r.isPromoUpc).length,
  }

  return { rows: processedRows, format, errors, stats }
}

// ─── Export Generator (34-field pipe-delimited) ───────────────────

export interface ExportableEvent {
  outletName: string
  outletNumber: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  transactionDate: string
  marketBasketId: string
  scanId: number
  registerId: string
  quantity: number
  price: number
  upcCode: string
  upcDescription: string
  unitOfMeasure: string
  promoFlag: boolean
  outletMultipackFlag: boolean
  outletMultipackQty: number | null
  outletMultipackDiscAmt: number
  acctPromoName: string
  acctDiscAmt: number
  mfgDiscAmt: number
  pidCoupon: string
  pidCouponDisc: number
  mfgMultipackFlag: boolean
  mfgMultipackQty: number | null
  mfgMultipackDiscAmt: number
  mfgPromoDesc: string
  mfgBuydownDesc: string
  mfgBuydownAmt: number
  mfgMultipackDesc: string
  loyaltyId: string
  couponDesc: string
}

function fmtDec(val: number): string {
  return val.toFixed(2)
}

export function generateRmscExportLine(event: ExportableEvent): string {
  return [
    event.outletName,                         // 1
    event.outletNumber,                       // 2
    event.address1,                           // 3
    event.address2,                           // 4
    event.city,                               // 5
    event.state,                              // 6
    event.zip,                                // 7
    event.transactionDate,                    // 8
    event.marketBasketId,                     // 9
    event.scanId.toString(),                  // 10
    event.registerId,                         // 11
    event.quantity.toString(),                // 12
    fmtDec(event.price),                      // 13
    event.upcCode,                            // 14
    event.upcDescription,                     // 15
    event.unitOfMeasure.toUpperCase(),        // 16
    event.promoFlag ? 'Y' : 'N',             // 17
    event.outletMultipackFlag ? 'Y' : 'N',   // 18
    event.outletMultipackQty?.toString() || '',// 19
    event.outletMultipackDiscAmt ? fmtDec(event.outletMultipackDiscAmt) : '', // 20
    event.acctPromoName,                      // 21
    event.acctDiscAmt ? fmtDec(event.acctDiscAmt) : '0.00', // 22
    event.mfgDiscAmt ? fmtDec(event.mfgDiscAmt) : '0.00',   // 23
    event.pidCoupon,                          // 24
    event.pidCouponDisc ? fmtDec(event.pidCouponDisc) : '0.00', // 25
    event.mfgMultipackFlag ? 'Y' : 'N',      // 26
    event.mfgMultipackQty?.toString() || '',  // 27
    event.mfgMultipackDiscAmt ? fmtDec(event.mfgMultipackDiscAmt) : '0.00', // 28
    event.mfgPromoDesc,                       // 29
    event.mfgBuydownDesc,                     // 30
    event.mfgBuydownAmt ? fmtDec(event.mfgBuydownAmt) : '0.00', // 31
    event.mfgMultipackDesc,                   // 32
    event.loyaltyId,                          // 33
    event.couponDesc,                         // 34
  ].join('|')
}

export function generateRmscExportFile(events: ExportableEvent[]): string {
  return events.map(generateRmscExportLine).join('\n') + '\n'
}
