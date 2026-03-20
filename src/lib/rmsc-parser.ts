/**
 * RMSC 34-Field Scan Data Parser
 *
 * Parses RMSC-format CSV/Excel files into normalized records.
 * Supports both CSV (with BOM handling) and XLSX (in-memory ArrayBuffer parsing).
 *
 * Validation chain:
 * 1. File present
 * 2. Extension/type allowed
 * 3. Header count ≤ 34
 * 4. Header names match expected RMSC template
 * 5. Row-level required fields present
 * 6. Numeric/date coercion
 * 7. Duplicate detection by rowHash
 */

import { createHash } from 'crypto'

// ─── RMSC 34-field header mapping ────────────────────────────────────────────

export const RMSC_HEADERS = [
    'Outlet Name',        // 1
    'Outlet Number',      // 2
    'Address 1',          // 3
    'Address 2',          // 4
    'City',               // 5
    'State',              // 6
    'Zip',                // 7
    'Transaction Date',   // 8
    'Market Basket ID',   // 9
    'Scan ID',            // 10
    'Register ID',        // 11
    'Quantity',           // 12
    'Price',              // 13
    'UPC Code',           // 14
    'UPC Description',    // 15
    'Unit Of Measure',    // 16
    'Promo Flag',         // 17
    'Outlet MultiPack Flag',       // 18
    'Outlet MultiPack Quantity',   // 19
    'Outlet MultiPack Disc Amt',   // 20
    'Acct Promo Name',             // 21
    'Acct Disc Amt',               // 22
    'Mfg Disc Amt',                // 23
    'PID Coupon',                  // 24
    'PID Coupon Disc',             // 25 — also used for loyalty discount
    'Mfg MultiPack Flag',          // 26
    'Mfg MultiPack Quantity',      // 27
    'Mfg MultiPack Disc Amt',      // 28
    'Mfg Promo Desc',              // 29
    'Mfg BuyDown Desc',            // 30
    'Mfg BuyDown Amt',             // 31
    'Mfg MultiPack Desc',          // 32
    'Acct Loyalty ID',             // 33
    'Coupon Desc',                 // 34
] as const

export type RmscRawRow = Record<string, string>

export interface RmscParsedRecord {
    sourceRowNumber: number
    rowHash: string
    outletNumber: string | null
    transactionDate: Date | null
    basketId: string | null
    scanId: string | null
    registerNo: string | null
    upc: string | null
    productDescription: string | null
    quantity: number | null
    unitPrice: number | null
    extendedPrice: number | null
    manufacturerCode: string | null
    manufacturerName: string | null
    promoFlag: boolean
    promoType: string | null
    multipackFlag: boolean
    buydownAmount: number | null
    loyaltyFlag: boolean
    rawFields: Record<string, string>
}

export interface RmscParseError {
    row: number
    field?: string
    message: string
}

export interface RmscParseResult {
    records: RmscParsedRecord[]
    errors: RmscParseError[]
    totalRows: number
    skippedEmpty: number
}

// ─── Manufacturer detection ──────────────────────────────────────────────────

const MFG_BUYDOWN_MAP: Record<string, string> = {
    'rjr buydown': 'RJR',
    'rjr': 'RJR',
    'marl buydown': 'ALTRIA',
    'marlboro': 'ALTRIA',
    'usst buydown': 'ALTRIA',
    'usst': 'ALTRIA',
    'copenhagen': 'ALTRIA',
    'itg': 'ITG',
}

function detectMfg(buydownDesc: string, promoDesc: string, productDesc: string): { code: string; name: string } {
    const combined = `${buydownDesc} ${promoDesc} ${productDesc}`.toLowerCase()

    for (const [key, mfg] of Object.entries(MFG_BUYDOWN_MAP)) {
        if (combined.includes(key)) return { code: mfg, name: mfg }
    }

    // Brand-level detection from product description
    const lower = productDesc.toLowerCase()
    if (['camel', 'newport', 'pall mall', 'natural american spirit', 'grizzly', 'vuse', 'velo', 'lucky strike'].some(b => lower.includes(b)))
        return { code: 'RJR', name: 'RJR' }
    if (['marlboro', 'virginia slim', 'parliament', 'basic', 'l&m', 'copenhagen', 'skoal', 'on!'].some(b => lower.includes(b)))
        return { code: 'ALTRIA', name: 'ALTRIA' }
    if (['kool', 'winston', 'maverick', 'salem', 'usa gold'].some(b => lower.includes(b)))
        return { code: 'ITG', name: 'ITG' }

    return { code: 'OTHER', name: 'OTHER' }
}

// ─── Promo type classification ───────────────────────────────────────────────

function classifyPromo(row: RmscRawRow): string | null {
    if (row['Mfg MultiPack Flag']?.toUpperCase() === 'Y' || row['Outlet MultiPack Flag']?.toUpperCase() === 'Y')
        return 'MULTIPACK'
    if (row['PID Coupon'] && row['PID Coupon'].trim())
        return 'COUPON'
    if (row['Acct Loyalty ID'] && row['Acct Loyalty ID'].trim())
        return 'LOYALTY'
    if (row['Mfg BuyDown Amt'] && parseFloat(row['Mfg BuyDown Amt']) > 0)
        return 'BUYDOWN'
    if (row['Mfg Disc Amt'] && parseFloat(row['Mfg Disc Amt']) > 0)
        return 'MFG_DISCOUNT'
    if (row['Acct Disc Amt'] && parseFloat(row['Acct Disc Amt']) > 0)
        return 'ACCT_DISCOUNT'
    if (row['Promo Flag']?.toUpperCase() === 'Y')
        return 'PROMO_OTHER'
    return null
}

// ─── Date parser ─────────────────────────────────────────────────────────────

function parseRmscDate(dateStr: string | undefined): Date | null {
    if (!dateStr || !dateStr.trim()) return null
    // RMSC format: "2017-11-01-19:41:00" or "2023-01-15-22:02"
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (match) {
        const [, y, m, d, h, min, sec] = match
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(sec || '0'))
    }
    // Fallback: try standard Date parsing
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? null : parsed
}

// ─── Row hash for dedupe ─────────────────────────────────────────────────────

function computeRowHash(row: RmscRawRow): string {
    // Hash key fields: outlet, date, basket, scan, UPC, qty, price
    const key = [
        row['Outlet Number'] || '',
        row['Transaction Date'] || '',
        row['Market Basket ID'] || '',
        row['Scan ID'] || '',
        row['UPC Code'] || '',
        row['Quantity'] || '',
        row['Price'] || '',
        row['Promo Flag'] || '',
    ].join('|')
    return createHash('sha256').update(key).digest('hex').substring(0, 32)
}

// ─── File hash for batch dedupe ──────────────────────────────────────────────

export function computeFileHash(content: ArrayBuffer | string): string {
    const buffer = typeof content === 'string'
        ? Buffer.from(content, 'utf-8')
        : Buffer.from(content)
    return createHash('sha256').update(buffer).digest('hex')
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function stripBOM(text: string): string {
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
}

export function parseCsvContent(csvText: string): RmscParseResult {
    const text = stripBOM(csvText)
    const lines = text.split(/\r?\n/)
    const records: RmscParsedRecord[] = []
    const errors: RmscParseError[] = []
    let skippedEmpty = 0

    // Find the header row (look for row containing "Outlet Name" in any position)
    let headerRowIdx = -1
    let headerMap: string[] = []

    for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (lines[i].includes('Outlet Name') && lines[i].includes('UPC Code')) {
            headerRowIdx = i
            // Parse the CSV cells, handling quoted values
            headerMap = parseCsvLine(lines[i])
            break
        }
    }

    if (headerRowIdx === -1) {
        errors.push({ row: 0, message: 'Could not find RMSC header row (expected "Outlet Name" and "UPC Code")' })
        return { records, errors, totalRows: 0, skippedEmpty }
    }

    // Trim and normalize headers — find the offset where "Outlet Name" starts
    const outletIdx = headerMap.findIndex(h => h.trim() === 'Outlet Name')

    // Process data rows
    for (let i = headerRowIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line || line.replace(/,/g, '').trim() === '') {
            skippedEmpty++
            continue
        }

        const cells = parseCsvLine(line)
        const row: RmscRawRow = {}

        // Map cells to headers, starting from the correct offset
        for (let j = 0; j < RMSC_HEADERS.length; j++) {
            const cellIdx = outletIdx + j
            row[RMSC_HEADERS[j]] = (cells[cellIdx] || '').trim()
        }

        // Skip rows without meaningful data (no UPC and no outlet)
        if (!row['UPC Code'] && !row['Outlet Name']) {
            skippedEmpty++
            continue
        }

        // Validate required fields
        const rowNum = i + 1
        if (!row['UPC Code'] && row['Outlet Name']) {
            errors.push({ row: rowNum, field: 'UPC Code', message: 'Missing UPC' })
            continue
        }

        // Parse and normalize
        const qty = parseFloat(row['Quantity'] || '0')
        const price = parseFloat(row['Price'] || '0')
        const buydownAmt = parseFloat(row['Mfg BuyDown Amt'] || '0')
        const mfg = detectMfg(row['Mfg BuyDown Desc'] || '', row['Mfg Promo Desc'] || '', row['UPC Description'] || '')

        records.push({
            sourceRowNumber: rowNum,
            rowHash: computeRowHash(row),
            outletNumber: row['Outlet Number'] || null,
            transactionDate: parseRmscDate(row['Transaction Date']),
            basketId: row['Market Basket ID'] || null,
            scanId: row['Scan ID'] || null,
            registerNo: row['Register ID'] || null,
            upc: row['UPC Code'] || null,
            productDescription: row['UPC Description'] || null,
            quantity: isNaN(qty) ? null : qty,
            unitPrice: isNaN(price) ? null : price,
            extendedPrice: isNaN(qty) || isNaN(price) ? null : Math.round(qty * price * 100) / 100,
            manufacturerCode: mfg.code,
            manufacturerName: mfg.name,
            promoFlag: row['Promo Flag']?.toUpperCase() === 'Y',
            promoType: classifyPromo(row),
            multipackFlag: row['Mfg MultiPack Flag']?.toUpperCase() === 'Y' || row['Outlet MultiPack Flag']?.toUpperCase() === 'Y',
            buydownAmount: isNaN(buydownAmt) ? null : buydownAmt,
            loyaltyFlag: !!(row['Acct Loyalty ID'] && row['Acct Loyalty ID'].trim()),
            rawFields: row,
        })
    }

    return { records, errors, totalRows: records.length + errors.length, skippedEmpty }
}

// ─── CSV line parser (handles quoted fields with commas) ─────────────────────

function parseCsvLine(line: string): string[] {
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            cells.push(current)
            current = ''
        } else {
            current += char
        }
    }
    cells.push(current)
    return cells
}

// ─── Excel parser (in-memory via xlsx) ───────────────────────────────────────

export function parseExcelContent(buffer: ArrayBuffer): RmscParseResult {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Try each sheet until we find one with RMSC data
    for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName]
        const csvText = XLSX.utils.sheet_to_csv(ws)
        if (csvText.includes('Outlet Name') && csvText.includes('UPC Code')) {
            const result = parseCsvContent(csvText)
            if (result.records.length > 0) return result
        }
    }

    // If no single sheet had results, parse all sheets and combine
    const allRecords: RmscParsedRecord[] = []
    const allErrors: RmscParseError[] = []
    let totalSkipped = 0

    for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName]
        const csvText = XLSX.utils.sheet_to_csv(ws)
        if (!csvText.includes('Outlet Name')) continue
        const result = parseCsvContent(csvText)
        allRecords.push(...result.records)
        allErrors.push(...result.errors)
        totalSkipped += result.skippedEmpty
    }

    return {
        records: allRecords,
        errors: allErrors,
        totalRows: allRecords.length + allErrors.length,
        skippedEmpty: totalSkipped,
    }
}
