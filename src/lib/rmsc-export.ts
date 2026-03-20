/**
 * RMSC 34-Field CSV Export Generator
 *
 * Generates RMSC-format CSV from POS transaction data.
 * Separate from pipe-delimited manufacturer exports in tobacco-export.ts.
 *
 * RMSC 34 fields:
 *  1. Outlet Name        2. Outlet Number     3. Address 1
 *  4. Address 2          5. City              6. State
 *  7. Zip                8. Transaction Date  9. Market Basket ID
 * 10. Scan ID           11. Register ID      12. Quantity
 * 13. Price             14. UPC Code         15. UPC Description
 * 16. Unit Of Measure   17. Promo Flag       18. Outlet MultiPack Flag
 * 19. Outlet MultiPack Quantity  20. Outlet MultiPack Disc Amt
 * 21. Acct Promo Name   22. Acct Disc Amt    23. Mfg Disc Amt
 * 24. PID Coupon        25. PID Coupon Disc  26. Mfg MultiPack Flag
 * 27. Mfg MultiPack Quantity  28. Mfg MultiPack Disc Amt
 * 29. Mfg Promo Desc   30. Mfg BuyDown Desc 31. Mfg BuyDown Amt
 * 32. Mfg MultiPack Desc  33. Acct Loyalty ID  34. Coupon Desc
 */

import { RMSC_HEADERS } from './rmsc-parser'

export interface RmscStoreInfo {
    outletName: string
    outletNumber: string
    address1: string
    address2: string
    city: string
    state: string
    zip: string
}

export interface RmscTransactionRow {
    transactionDate: Date
    basketId: string
    scanId: string
    registerId: string
    quantity: number
    price: number
    upc: string
    description: string
    unitOfMeasure: string       // Pack, Carton, Can, etc.
    promoFlag: boolean
    outletMultiPackFlag: boolean
    outletMultiPackQty: number
    outletMultiPackDisc: number
    acctPromoName: string
    acctDiscAmt: number
    mfgDiscAmt: number
    pidCoupon: string
    pidCouponDisc: number
    mfgMultiPackFlag: boolean
    mfgMultiPackQty: number
    mfgMultiPackDisc: number
    mfgPromoDesc: string
    mfgBuyDownDesc: string
    mfgBuyDownAmt: number
    mfgMultiPackDesc: string
    acctLoyaltyId: string
    couponDesc: string
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function fmtRmscDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const sec = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day}-${h}:${min}:${sec}`
}

function fmtPrice(n: number): string {
    return n ? (Math.round(n * 100) / 100).toFixed(2) : ''
}

// ─── CSV escaping ────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

// ─── Generate RMSC CSV ───────────────────────────────────────────────────────

export function generateRmscCsv(
    store: RmscStoreInfo,
    rows: RmscTransactionRow[]
): string {
    const lines: string[] = []

    // Header row
    lines.push(RMSC_HEADERS.map(h => escapeCsv(h)).join(','))

    // Data rows
    for (const row of rows) {
        const cells = [
            store.outletName,
            store.outletNumber,
            store.address1,
            store.address2,
            store.city,
            store.state,
            store.zip,
            fmtRmscDate(row.transactionDate),
            row.basketId,
            row.scanId,
            row.registerId,
            String(row.quantity),
            fmtPrice(row.price),
            row.upc,
            row.description,
            row.unitOfMeasure,
            row.promoFlag ? 'Y' : 'N',
            row.outletMultiPackFlag ? 'Y' : '',
            row.outletMultiPackQty ? String(row.outletMultiPackQty) : '',
            row.outletMultiPackDisc ? fmtPrice(row.outletMultiPackDisc) : '',
            row.acctPromoName || '',
            row.acctDiscAmt ? fmtPrice(row.acctDiscAmt) : '',
            row.mfgDiscAmt ? fmtPrice(row.mfgDiscAmt) : '',
            row.pidCoupon || '',
            row.pidCouponDisc ? fmtPrice(row.pidCouponDisc) : '',
            row.mfgMultiPackFlag ? 'Y' : '',
            row.mfgMultiPackQty ? String(row.mfgMultiPackQty) : '',
            row.mfgMultiPackDisc ? fmtPrice(row.mfgMultiPackDisc) : '',
            row.mfgPromoDesc || '',
            row.mfgBuyDownDesc || '',
            row.mfgBuyDownAmt ? fmtPrice(row.mfgBuyDownAmt) : '',
            row.mfgMultiPackDesc || '',
            row.acctLoyaltyId || '',
            row.couponDesc || '',
        ]
        lines.push(cells.map(c => escapeCsv(c)).join(','))
    }

    return lines.join('\r\n')
}

// ─── Build export rows from POS transactions ─────────────────────────────────

export interface TobaccoExportTxn {
    id: string
    createdAt: Date
    stationId?: string
    lineItems: {
        product: {
            barcode?: string | null
            sku?: string | null
            name?: string | null
            isTobacco?: boolean
            unitOfMeasure?: string | null
        } | null
        quantity: number
        price: any
        discount?: any
        discountReason?: string | null
    }[]
}

export interface TobaccoDealMatch {
    manufacturer: string
    dealName: string
    dealType: string
    discountAmount: number
}

export function buildRmscRows(
    store: RmscStoreInfo,
    transactions: TobaccoExportTxn[],
    deals: TobaccoDealMatch[]
): RmscTransactionRow[] {
    const rows: RmscTransactionRow[] = []
    let globalScanSeq = 1

    for (const txn of transactions) {
        const tobaccoItems = txn.lineItems.filter(li => li.product?.isTobacco)
        if (tobaccoItems.length === 0) continue

        const basketId = txn.id.substring(0, 12)
        const isMultiPack = tobaccoItems.length > 1 || tobaccoItems.some(li => li.quantity > 1)

        for (const item of tobaccoItems) {
            const product = item.product!
            const upc = product.barcode || product.sku || ''
            const name = (product.name || '').toUpperCase()
            const price = parseFloat(item.price?.toString() || '0')
            const discount = parseFloat(item.discount?.toString() || '0')

            // Match deals
            const matchedDeal = deals.find(d => {
                if (d.dealType === 'MULTI_BUY' && !isMultiPack) return false
                return true // simplified matching — production would check UPC/brand
            })

            const uom = detectUomFromName(name, product.unitOfMeasure || '')

            rows.push({
                transactionDate: txn.createdAt,
                basketId,
                scanId: String(globalScanSeq++),
                registerId: txn.stationId || '1',
                quantity: item.quantity,
                price,
                upc,
                description: name,
                unitOfMeasure: uom,
                promoFlag: discount > 0,
                outletMultiPackFlag: false,
                outletMultiPackQty: 0,
                outletMultiPackDisc: 0,
                acctPromoName: '',
                acctDiscAmt: 0,
                mfgDiscAmt: matchedDeal ? matchedDeal.discountAmount : 0,
                pidCoupon: '',
                pidCouponDisc: 0,
                mfgMultiPackFlag: isMultiPack && !!matchedDeal,
                mfgMultiPackQty: isMultiPack ? item.quantity : 0,
                mfgMultiPackDisc: 0,
                mfgPromoDesc: matchedDeal?.dealName || '',
                mfgBuyDownDesc: matchedDeal?.manufacturer
                    ? `${matchedDeal.manufacturer} Buydown`
                    : '',
                mfgBuyDownAmt: matchedDeal?.discountAmount || 0,
                mfgMultiPackDesc: isMultiPack && matchedDeal
                    ? `${matchedDeal.manufacturer} MP`
                    : '',
                acctLoyaltyId: '',
                couponDesc: item.discountReason || '',
            })
        }
    }

    return rows
}

function detectUomFromName(name: string, explicit: string): string {
    if (explicit) {
        const lower = explicit.toLowerCase()
        if (lower.includes('carton')) return 'Carton'
        if (lower.includes('can')) return 'Can'
        if (lower.includes('roll')) return 'Roll'
        if (lower.includes('pouch')) return 'Pouch'
        if (lower.includes('tin')) return 'Tin'
    }
    const lower = name.toLowerCase()
    if (lower.includes('carton')) return 'Carton'
    if (lower.includes(' can') || lower.includes(' lc ')) return 'Can'
    if (lower.includes('roll')) return 'Roll'
    if (lower.includes('pouch')) return 'Pouch'
    if (lower.includes('tin')) return 'Tin'
    return 'Pack'
}
