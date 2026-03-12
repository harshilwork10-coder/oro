/**
 * Fintech Invoice CSV Parser
 *
 * Parses the "StandardAnalyticsDetailedDelimited" CSV format (33 columns).
 * Groups line items by vendor + invoice number into separate invoices.
 *
 * CSV Column Order:
 * 0: Vendor Name, 1: Retailer Name, 2: Retailer VendorID,
 * 3: Vendor Store Number, 4: Retailer Store Number,
 * 5: Fintech Process Date, 6: Invoice Date, 7: Invoice DueDate,
 * 8: Invoice Number, 9: Invoice Amount, 10: Invoice Item Count,
 * 11: PO Number, 12: PO Date, 13: Reference Invoice Number,
 * 14: Product Number, 15: Quantity, 16: Invoice Line Item Cost,
 * 17: Unit Of Measure, 18: Product Volume,
 * 19: Case UPC, 20: Product Description,
 * 21: Discount Adjustment Total, 22: Deposit Adjustment Total,
 * 23: Miscellaneous Adjustment Total, 24: Tax Adjustment Total,
 * 25: Delivery Adjustment Total, 26: Extended Price,
 * 27: Packs Per Case, 28: Clean UPC, 29: Pack UPC,
 * 30: Product Class, 31: GL Code, 32: Expanded StoreID (optional 33: Units Per Pack)
 */

export interface ParsedInvoiceItem {
  lineNumber: number
  vendorName: string
  retailerName: string
  retailerVendorId: string
  vendorStoreNum: string
  retailerStoreNum: string
  processDate: string
  invoiceDate: string
  dueDate: string
  invoiceNumber: string
  invoiceAmount: number
  invoiceItemCount: number
  poNumber: string
  poDate: string
  refInvoiceNumber: string
  vendorProductNum: string
  quantity: number
  unitCost: number
  unitOfMeasure: string
  productVolume: string
  caseUpc: string
  productDesc: string
  discountAdj: number
  depositAdj: number
  miscAdj: number
  taxAdj: number
  deliveryAdj: number
  extendedPrice: number
  packsPerCase: number | null
  cleanUpc: string
  packUpc: string
  productClass: string
  glCode: string
  expandedStoreId: string
  unitsPerPack: number | null
}

export interface GroupedInvoice {
  vendorName: string
  retailerVendorId: string
  vendorStoreNum: string
  retailerStoreNum: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  processDate: string
  invoiceAmount: number
  invoiceItemCount: number
  poNumber: string
  poDate: string
  refInvoiceNumber: string
  invoiceType: 'INVOICE' | 'CREDIT' | 'RETURN'
  items: ParsedInvoiceItem[]
}

export interface ParseResult {
  success: boolean
  invoices: GroupedInvoice[]
  totalRows: number
  parsedRows: number
  errorRows: number
  errors: { row: number; field: string; message: string }[]
}

/**
 * Parse a CSV string in the standardized fintech format into grouped invoices.
 */
function safeParseCsvLine(line: string): string[] {
  // Handle commas inside quoted fields
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

function safeParseFloat(val: string): number {
  if (!val || val.trim() === '') return 0
  const cleaned = val.replace(/[,$]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function safeParseInt(val: string): number | null {
  if (!val || val.trim() === '') return null
  const num = parseInt(val, 10)
  return isNaN(num) ? null : num
}

function safeStr(val: string | undefined): string {
  return (val || '').trim()
}

/**
 * Determine invoice type from context:
 * - If any line has negative quantity → likely CREDIT
 * - If Reference Invoice Number present → CREDIT or RETURN
 * - Default → INVOICE
 */
function detectInvoiceType(items: ParsedInvoiceItem[]): 'INVOICE' | 'CREDIT' | 'RETURN' {
  const hasNegativeQty = items.some(i => i.quantity < 0)
  const hasRefInvoice = items.some(i => i.refInvoiceNumber && i.refInvoiceNumber.length > 0)

  if (hasNegativeQty && hasRefInvoice) return 'RETURN'
  if (hasNegativeQty || hasRefInvoice) return 'CREDIT'
  return 'INVOICE'
}

/**
 * Main parser: CSV text → ParseResult
 */
export function parseInvoiceCsv(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  const errors: { row: number; field: string; message: string }[] = []

  if (lines.length < 2) {
    return {
      success: false,
      invoices: [],
      totalRows: 0,
      parsedRows: 0,
      errorRows: 0,
      errors: [{ row: 0, field: 'file', message: 'File is empty or has no data rows' }]
    }
  }

  // Validate header
  const headerFields = safeParseCsvLine(lines[0])
  const expectedHeaders = ['Vendor Name', 'Retailer Name', 'Retailer VendorID']
  const headerValid = expectedHeaders.every((h, i) =>
    headerFields[i]?.toLowerCase().includes(h.toLowerCase().split(' ')[0])
  )

  if (!headerValid) {
    return {
      success: false,
      invoices: [],
      totalRows: lines.length - 1,
      parsedRows: 0,
      errorRows: lines.length - 1,
      errors: [{ row: 1, field: 'header', message: 'CSV header does not match Fintech StandardAnalyticsDetailedDelimited format. Expected columns starting with: Vendor Name, Retailer Name, Retailer VendorID' }]
    }
  }

  const dataLines = lines.slice(1)
  const parsedItems: ParsedInvoiceItem[] = []
  let errorCount = 0

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2 // 1-indexed, skip header
    try {
      const f = safeParseCsvLine(dataLines[i])

      // Minimum validation: must have at least 31 fields
      if (f.length < 31) {
        errors.push({ row: rowNum, field: 'columns', message: `Expected 31+ columns, got ${f.length}` })
        errorCount++
        continue
      }

      // Required fields check
      const vendorName = safeStr(f[0])
      const invoiceNumber = safeStr(f[8])
      const productDesc = safeStr(f[20])
      if (!vendorName || !invoiceNumber) {
        errors.push({ row: rowNum, field: 'vendorName/invoiceNumber', message: 'Missing required field' })
        errorCount++
        continue
      }

      const item: ParsedInvoiceItem = {
        lineNumber: rowNum,
        vendorName,
        retailerName: safeStr(f[1]),
        retailerVendorId: safeStr(f[2]),
        vendorStoreNum: safeStr(f[3]),
        retailerStoreNum: safeStr(f[4]),
        processDate: safeStr(f[5]),
        invoiceDate: safeStr(f[6]),
        dueDate: safeStr(f[7]),
        invoiceNumber,
        invoiceAmount: safeParseFloat(f[9]),
        invoiceItemCount: safeParseInt(f[10]) ?? 0,
        poNumber: safeStr(f[11]),
        poDate: safeStr(f[12]),
        refInvoiceNumber: safeStr(f[13]),
        vendorProductNum: safeStr(f[14]),
        quantity: safeParseInt(f[15]) ?? 0,
        unitCost: safeParseFloat(f[16]),
        unitOfMeasure: safeStr(f[17]).toUpperCase(),
        productVolume: safeStr(f[18]),
        caseUpc: safeStr(f[19]),
        productDesc: productDesc || 'Unknown Product',
        discountAdj: safeParseFloat(f[21]),
        depositAdj: safeParseFloat(f[22]),
        miscAdj: safeParseFloat(f[23]),
        taxAdj: safeParseFloat(f[24]),
        deliveryAdj: safeParseFloat(f[25]),
        extendedPrice: safeParseFloat(f[26]),
        packsPerCase: safeParseInt(f[27]),
        cleanUpc: safeStr(f[28]),
        packUpc: safeStr(f[29]),
        productClass: safeStr(f[30]),
        glCode: safeStr(f[31] || ''),
        expandedStoreId: safeStr(f[32] || ''),
        unitsPerPack: safeParseInt(f[33] || '')
      }

      parsedItems.push(item)
    } catch (err) {
      errors.push({ row: rowNum, field: 'parse', message: `Parse error: ${err instanceof Error ? err.message : 'Unknown'}` })
      errorCount++
    }
  }

  // Group by vendor + invoiceNumber (one file can have multiple invoices)
  const invoiceMap = new Map<string, ParsedInvoiceItem[]>()
  for (const item of parsedItems) {
    const key = `${item.vendorName}::${item.invoiceNumber}`
    if (!invoiceMap.has(key)) invoiceMap.set(key, [])
    invoiceMap.get(key)!.push(item)
  }

  const invoices: GroupedInvoice[] = []
  for (const [, items] of invoiceMap) {
    const first = items[0]
    invoices.push({
      vendorName: first.vendorName,
      retailerVendorId: first.retailerVendorId,
      vendorStoreNum: first.vendorStoreNum,
      retailerStoreNum: first.retailerStoreNum,
      invoiceNumber: first.invoiceNumber,
      invoiceDate: first.invoiceDate,
      dueDate: first.dueDate,
      processDate: first.processDate,
      invoiceAmount: first.invoiceAmount,
      invoiceItemCount: first.invoiceItemCount,
      poNumber: first.poNumber,
      poDate: first.poDate,
      refInvoiceNumber: first.refInvoiceNumber,
      invoiceType: detectInvoiceType(items),
      items
    })
  }

  return {
    success: errorCount === 0 || parsedItems.length > 0,
    invoices,
    totalRows: dataLines.length,
    parsedRows: parsedItems.length,
    errorRows: errorCount,
    errors
  }
}

/**
 * Compute base sellable units from invoice line item.
 *
 * Canonical unit = individual sellable unit (bottle, can, single pack).
 *
 * UOM:
 *   CA/CS (case)  → qty × packsPerCase × unitsPerPack
 *   BO (bottle)   → qty × unitsPerPack (usually 1)
 *   EA (each)     → qty
 *
 * Returns { baseUnits, perUnitCost }
 */
export function computeBaseUnits(item: ParsedInvoiceItem): { baseUnits: number; perUnitCost: number } {
  const qty = item.quantity
  const ppc = item.packsPerCase || 1
  const upp = item.unitsPerPack || 1
  const uom = item.unitOfMeasure

  let baseUnits: number

  if (uom === 'CA' || uom === 'CS') {
    // Case: qty × packs per case × units per pack
    baseUnits = qty * ppc * upp
  } else if (uom === 'BO') {
    // Bottle: typically 1 unit per, but respect unitsPerPack
    baseUnits = qty * upp
  } else {
    // EA or unknown: qty is already base units
    baseUnits = qty
  }

  const perUnitCost = baseUnits !== 0
    ? Math.abs(item.extendedPrice / baseUnits)
    : item.unitCost

  return { baseUnits, perUnitCost: Math.round(perUnitCost * 10000) / 10000 }
}
