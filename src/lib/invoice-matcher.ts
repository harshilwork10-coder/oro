/**
 * Invoice Matcher — 5-Step UPC/SKU Product Matching
 *
 * Match order:
 * 1. Supplier SKU exact match (ProductSupplier.sku for that supplier)
 * 2. Clean UPC → ProductBarcodeAlias
 * 3. Case UPC → ProductBarcodeAlias
 * 4. Pack UPC → ProductBarcodeAlias
 * 5. Legacy → Product.barcode (fallback)
 *
 * If no match found:
 * - Look up SharedUPCProduct for master data
 * - Use itemClassifier for category
 * - Create draft Product (isActive = false if no master data, true if from SharedUPCProduct)
 */

import { PrismaClient } from '@prisma/client'
import { generateBarcodeVariants, cleanBarcode } from './upc-normalizer'
import { classifyItem } from './itemClassifier'
import { type ParsedInvoiceItem, computeBaseUnits } from './fintech-invoice-parser'

export interface MatchResult {
  matchStatus: 'MATCHED' | 'NEW_PRODUCT' | 'SUGGESTED' | 'ERROR'
  matchMethod: string | null
  matchedProductId: string | null
  autoCreatedProductId: string | null
  suggestedProductIds: string[] | null
  costChanged: boolean
  previousCost: number | null
  costChangePct: number | null
  baseUnitsReceived: number
  perUnitCost: number
}

/**
 * Match a single invoice line item to a product in the database.
 */
export async function matchInvoiceItem(
  prisma: PrismaClient,
  item: ParsedInvoiceItem,
  franchiseId: string,
  supplierId: string | null,
  costAlertPct: number = 10
): Promise<MatchResult> {
  const { baseUnits, perUnitCost } = computeBaseUnits(item)

  // === Step 1: Supplier SKU exact match ===
  if (supplierId && item.vendorProductNum) {
    const supplierProduct = await prisma.productSupplier.findFirst({
      where: {
        supplierId,
        sku: item.vendorProductNum,
        product: { franchiseId }
      },
      include: { product: true }
    })
    if (supplierProduct) {
      const costResult = checkCostChange(supplierProduct.product.cost, perUnitCost, costAlertPct)
      return {
        matchStatus: 'MATCHED',
        matchMethod: 'SUPPLIER_SKU',
        matchedProductId: supplierProduct.productId,
        autoCreatedProductId: null,
        suggestedProductIds: null,
        baseUnitsReceived: baseUnits,
        perUnitCost,
        ...costResult
      }
    }
  }

  // === Steps 2-4: Barcode alias matching (Clean UPC → Case UPC → Pack UPC) ===
  const upcSearches = [
    { upc: item.cleanUpc, method: 'CLEAN_UPC' },
    { upc: item.caseUpc, method: 'CASE_UPC' },
    { upc: item.packUpc, method: 'PACK_UPC' }
  ]

  for (const { upc, method } of upcSearches) {
    if (!upc) continue
    const variants = generateBarcodeVariants(upc)
    if (variants.length === 0) continue

    const alias = await prisma.productBarcodeAlias.findFirst({
      where: {
        barcode: { in: variants },
        product: { franchiseId }
      },
      include: { product: true }
    })

    if (alias) {
      const costResult = checkCostChange(alias.product.cost, perUnitCost, costAlertPct)
      return {
        matchStatus: 'MATCHED',
        matchMethod: method,
        matchedProductId: alias.productId,
        autoCreatedProductId: null,
        suggestedProductIds: null,
        baseUnitsReceived: baseUnits,
        perUnitCost,
        ...costResult
      }
    }
  }

  // === Step 5: Legacy Product.barcode fallback ===
  const allUpcs = [item.cleanUpc, item.caseUpc, item.packUpc].filter(Boolean)
  const allVariants = allUpcs.flatMap(u => generateBarcodeVariants(u))

  if (allVariants.length > 0) {
    const legacyMatch = await prisma.product.findFirst({
      where: {
        franchiseId,
        barcode: { in: allVariants }
      }
    })
    if (legacyMatch) {
      // Migrate to alias table for future fast matching
      const primaryUpc = cleanBarcode(item.cleanUpc || item.caseUpc || item.packUpc)
      if (primaryUpc) {
        try {
          await prisma.productBarcodeAlias.upsert({
            where: { barcode: primaryUpc },
            create: {
              productId: legacyMatch.id,
              barcode: primaryUpc,
              type: 'CLEAN',
              isPrimary: true,
              source: 'INVOICE_IMPORT'
            },
            update: {} // Don't overwrite if exists
          })
        } catch {
          // Ignore duplicate — barcode already mapped
        }
      }

      const costResult = checkCostChange(legacyMatch.cost, perUnitCost, costAlertPct)
      return {
        matchStatus: 'MATCHED',
        matchMethod: 'LEGACY_BARCODE',
        matchedProductId: legacyMatch.id,
        autoCreatedProductId: null,
        suggestedProductIds: null,
        baseUnitsReceived: baseUnits,
        perUnitCost,
        ...costResult
      }
    }
  }

  // === No match found — look up master DB, then create new product ===
  const newProductId = await createProductFromInvoice(
    prisma, item, franchiseId, supplierId, perUnitCost
  )

  // Find suggested matches by description similarity (top 3)
  const suggestions = await findSuggestedMatches(prisma, item, franchiseId)

  return {
    matchStatus: suggestions.length > 0 ? 'SUGGESTED' : 'NEW_PRODUCT',
    matchMethod: null,
    matchedProductId: null,
    autoCreatedProductId: newProductId,
    suggestedProductIds: suggestions.length > 0 ? suggestions : null,
    costChanged: false,
    previousCost: null,
    costChangePct: null,
    baseUnitsReceived: baseUnits,
    perUnitCost
  }
}

/**
 * Check if cost changed beyond threshold
 */
function checkCostChange(
  currentCost: unknown,
  newCost: number,
  thresholdPct: number
): { costChanged: boolean; previousCost: number | null; costChangePct: number | null } {
  const current = currentCost ? Number(currentCost) : 0
  if (current === 0) {
    return { costChanged: false, previousCost: current, costChangePct: null }
  }
  const pctChange = Math.abs((newCost - current) / current) * 100
  return {
    costChanged: pctChange > thresholdPct,
    previousCost: current,
    costChangePct: Math.round(pctChange * 100) / 100
  }
}

/**
 * Create a new product from invoice line + SharedUPCProduct master data
 */
async function createProductFromInvoice(
  prisma: PrismaClient,
  item: ParsedInvoiceItem,
  franchiseId: string,
  supplierId: string | null,
  perUnitCost: number
): Promise<string> {
  // 1. Try SharedUPCProduct for master data
  const primaryUpc = cleanBarcode(item.cleanUpc || item.caseUpc || item.packUpc)
  let masterData: {
    name: string
    brand: string | null
    category: string | null
    size: string | null
    avgPrice: number | null
  } | null = null

  if (primaryUpc) {
    const variants = generateBarcodeVariants(primaryUpc)
    const shared = await prisma.sharedUPCProduct.findFirst({
      where: { barcode: { in: variants } }
    })
    if (shared) {
      masterData = {
        name: shared.name,
        brand: shared.brand,
        category: shared.category,
        size: shared.size,
        avgPrice: shared.avgPrice ? Number(shared.avgPrice) : null
      }
    }
  }

  // 2. Use itemClassifier for category mapping
  const categories = await prisma.productCategory.findMany({
    where: { franchiseId },
    select: { id: true, name: true }
  })
  const classification = classifyItem(
    masterData?.name || item.productDesc,
    item.productClass || masterData?.category,
    categories
  )

  // 3. Determine alcohol type from productClass
  let alcoholType: string | null = null
  const pClass = (item.productClass || '').toLowerCase()
  if (pClass.includes('spirit') || pClass.includes('liquor')) alcoholType = 'SPIRITS'
  else if (pClass.includes('wine')) alcoholType = 'WINE_LIGHT'
  else if (pClass.includes('beer')) alcoholType = 'BEER'

  // 4. Create the product
  // If we have master data (SharedUPCProduct), create as active
  // If only invoice data, create as inactive for review
  const hasReliableData = !!masterData
  const product = await prisma.product.create({
    data: {
      franchiseId,
      name: masterData?.name || item.productDesc,
      description: `Auto-created from invoice: ${item.vendorName} #${item.invoiceNumber}`,
      price: masterData?.avgPrice ?? perUnitCost,
      cashPrice: masterData?.avgPrice ?? perUnitCost,
      cost: perUnitCost,
      stock: 0, // Stock updates happen at posting time
      barcode: primaryUpc || undefined,
      categoryId: classification.categoryId || undefined,
      productType: classification.productType || undefined,
      brand: masterData?.brand || undefined,
      vendor: item.vendorName,
      size: masterData?.size || item.productVolume || undefined,
      alcoholType,
      unitsPerCase: item.packsPerCase
        ? (item.packsPerCase * (item.unitsPerPack || 1))
        : undefined,
      isActive: hasReliableData, // Inactive if no master data
      ageRestricted: !!alcoholType
    }
  })

  // 5. Create barcode aliases
  const upcEntries = [
    { upc: item.cleanUpc, type: 'CLEAN' },
    { upc: item.caseUpc, type: 'CASE' },
    { upc: item.packUpc, type: 'PACK' }
  ]
  for (const { upc, type } of upcEntries) {
    const cleaned = cleanBarcode(upc)
    if (cleaned) {
      try {
        await prisma.productBarcodeAlias.create({
          data: {
            productId: product.id,
            barcode: cleaned,
            type,
            isPrimary: type === 'CLEAN',
            source: 'INVOICE_IMPORT'
          }
        })
      } catch {
        // Ignore duplicate barcode
      }
    }
  }

  // 6. Create supplier product link
  if (supplierId && item.vendorProductNum) {
    try {
      await prisma.productSupplier.create({
        data: {
          productId: product.id,
          supplierId,
          cost: perUnitCost,
          sku: item.vendorProductNum,
          lastInvoiceDate: new Date(),
          lastUpcSeen: primaryUpc || undefined
        }
      })
    } catch {
      // Ignore if already exists
    }
  }

  return product.id
}

/**
 * Find suggested product matches by description keywords
 */
async function findSuggestedMatches(
  prisma: PrismaClient,
  item: ParsedInvoiceItem,
  franchiseId: string
): Promise<string[]> {
  // Extract meaningful keywords from description (skip short words)
  const keywords = item.productDesc
    .split(/[\s,\-\/]+/)
    .filter(w => w.length > 3)
    .slice(0, 3)

  if (keywords.length === 0) return []

  const suggestions = await prisma.product.findMany({
    where: {
      franchiseId,
      OR: keywords.map(kw => ({
        name: { contains: kw, mode: 'insensitive' as const }
      }))
    },
    select: { id: true },
    take: 3
  })

  return suggestions.map(s => s.id)
}
