/**
 * Invoice Poster — Transactional, Idempotent Posting & Void/Reverse
 *
 * Posting flow (single DB transaction):
 * 1. Lock invoice — verify not already posted
 * 2. For each matched item:
 *    a. Create StockAdjustment (audit trail)
 *    b. Update Product.stock
 *    c. Update Product.cost if changed
 *    d. Create ProductCostHistory entry
 *    e. Update ProductSupplier with latest cost/date
 * 3. Stamp invoice as POSTED
 *
 * Void flow (compensating movements):
 * 1. Verify invoice is POSTED
 * 2. Create reverse StockAdjustments
 * 3. Decrement Product.stock
 * 4. Stamp invoice as VOIDED
 */

import { PrismaClient, Prisma } from '@prisma/client'

interface PostResult {
  success: boolean
  message: string
  stockUpdates: number
  costUpdates: number
}

/**
 * Post an invoice — update stock and cost in a single atomic transaction.
 * Idempotent: if already POSTED, returns error without side effects.
 */
export async function postInvoice(
  prisma: PrismaClient,
  invoiceId: string,
  userId: string,
  locationId: string
): Promise<PostResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock and verify invoice status
    const invoice = await tx.vendorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          where: { matchStatus: 'MATCHED' }
        }
      }
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    if (invoice.status === 'POSTED') {
      throw new Error('Invoice already posted — cannot post twice')
    }

    if (invoice.status === 'VOIDED') {
      throw new Error('Invoice has been voided — cannot post')
    }

    let stockUpdates = 0
    let costUpdates = 0

    for (const item of invoice.items) {
      if (!item.matchedProductId || !item.baseUnitsReceived) continue

      // Get current product state
      const product = await tx.product.findUnique({
        where: { id: item.matchedProductId }
      })
      if (!product) continue

      const previousStock = product.stock
      const newStock = previousStock + item.baseUnitsReceived

      // 2a. Create StockAdjustment (audit trail)
      await tx.stockAdjustment.create({
        data: {
          productId: item.matchedProductId,
          locationId,
          quantity: item.baseUnitsReceived,
          reason: 'VENDOR_INVOICE',
          notes: `Invoice #${invoice.invoiceNumber} from ${invoice.vendorName} — ${item.productDesc}`,
          sourceId: invoice.id,
          uom: item.unitOfMeasure || undefined,
          baseUnitsDelta: item.baseUnitsReceived,
          previousStock,
          newStock,
          performedBy: userId
        }
      })

      // 2b. Update Product.stock
      await tx.product.update({
        where: { id: item.matchedProductId },
        data: { stock: { increment: item.baseUnitsReceived } }
      })
      stockUpdates++

      // 2c/2d. Update cost if changed
      if (item.costChanged && item.perUnitCost) {
        const oldCost = product.cost ? Number(product.cost) : 0
        const newCost = Number(item.perUnitCost)

        // Cost history
        await tx.productCostHistory.create({
          data: {
            productId: item.matchedProductId,
            supplierId: invoice.supplierId || undefined,
            oldCost: new Prisma.Decimal(oldCost),
            newCost: new Prisma.Decimal(newCost),
            changePct: new Prisma.Decimal(item.costChangePct || 0),
            sourceType: 'VENDOR_INVOICE',
            sourceId: item.id,
            changedBy: userId
          }
        })

        // Update product cost (safe auto-update)
        await tx.product.update({
          where: { id: item.matchedProductId },
          data: { cost: new Prisma.Decimal(newCost) }
        })
        costUpdates++
      } else if (item.perUnitCost) {
        // Always update cost to latest vendor cost (even if within threshold)
        await tx.product.update({
          where: { id: item.matchedProductId },
          data: { cost: new Prisma.Decimal(Number(item.perUnitCost)) }
        })
      }

      // 2e. Update ProductSupplier
      if (invoice.supplierId) {
        await tx.productSupplier.upsert({
          where: {
            productId_supplierId: {
              productId: item.matchedProductId,
              supplierId: invoice.supplierId
            }
          },
          create: {
            productId: item.matchedProductId,
            supplierId: invoice.supplierId,
            cost: item.perUnitCost || 0,
            sku: item.vendorProductNum || undefined,
            lastInvoiceDate: new Date(),
            lastUpcSeen: item.cleanUpc || item.caseUpc || item.packUpc || undefined
          },
          update: {
            cost: item.perUnitCost || undefined,
            lastInvoiceDate: new Date(),
            lastUpcSeen: item.cleanUpc || item.caseUpc || item.packUpc || undefined
          }
        })
      }
    }

    // 3. Stamp invoice as POSTED
    await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedBy: userId
      }
    })

    return {
      success: true,
      message: `Posted: ${stockUpdates} stock updates, ${costUpdates} cost changes`,
      stockUpdates,
      costUpdates
    }
  }, {
    maxWait: 10000,
    timeout: 30000
  })
}

/**
 * Void a posted invoice — create compensating stock movements.
 * Never deletes data — creates reverse entries.
 */
export async function voidInvoice(
  prisma: PrismaClient,
  invoiceId: string,
  userId: string,
  reason: string,
  locationId: string
): Promise<PostResult> {
  if (!reason || reason.trim().length < 3) {
    throw new Error('Void reason is required (minimum 3 characters)')
  }

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.vendorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          where: { matchStatus: 'MATCHED' }
        }
      }
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    if (invoice.status !== 'POSTED') {
      throw new Error(`Cannot void invoice with status "${invoice.status}" — only POSTED invoices can be voided`)
    }

    let reversals = 0

    for (const item of invoice.items) {
      if (!item.matchedProductId || !item.baseUnitsReceived) continue

      const product = await tx.product.findUnique({
        where: { id: item.matchedProductId }
      })
      if (!product) continue

      const previousStock = product.stock
      const reverseQty = -item.baseUnitsReceived
      const newStock = previousStock + reverseQty

      // Compensating movement
      await tx.stockAdjustment.create({
        data: {
          productId: item.matchedProductId,
          locationId,
          quantity: reverseQty,
          reason: 'VOID_REVERSAL',
          notes: `VOID: Invoice #${invoice.invoiceNumber} — ${reason}`,
          sourceId: invoice.id,
          uom: item.unitOfMeasure || undefined,
          baseUnitsDelta: reverseQty,
          previousStock,
          newStock,
          performedBy: userId
        }
      })

      // Reverse stock
      await tx.product.update({
        where: { id: item.matchedProductId },
        data: { stock: { decrement: item.baseUnitsReceived } }
      })
      reversals++
    }

    // Stamp as voided
    await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason
      }
    })

    return {
      success: true,
      message: `Voided: ${reversals} stock reversals applied`,
      stockUpdates: reversals,
      costUpdates: 0
    }
  }, {
    maxWait: 10000,
    timeout: 30000
  })
}
