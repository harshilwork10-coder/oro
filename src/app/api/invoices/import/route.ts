import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseInvoiceCsv, computeBaseUnits } from '@/lib/fintech-invoice-parser'
import { matchInvoiceItem } from '@/lib/invoice-matcher'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth/mobileAuth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ROWS = 10000

/**
 * POST /api/invoices/import
 * Upload a fintech invoice CSV → parse → match → stage for review
 * Role: OWNER, ADMIN only
 */
export async function POST(request: Request) {
  try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    // Role guard: OWNER/ADMIN only
    const role = (user as { role?: string }).role
    if (!role || !['OWNER', 'ADMIN', 'PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions — OWNER/ADMIN required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const locationId = formData.get('locationId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // File size guard
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 })
    }

    const csvText = await file.text()

    // SHA256 hash for dedup
    const fileHash = crypto.createHash('sha256').update(csvText).digest('hex')

    // Check for duplicate file
    const existingFile = await prisma.inboundFile.findUnique({
      where: { fileHash }
    })
    if (existingFile) {
      return NextResponse.json({
        error: 'This file has already been imported',
        existingFileId: existingFile.id,
        importedAt: existingFile.createdAt
      }, { status: 409 })
    }

    // Parse CSV
    const parseResult = parseInvoiceCsv(csvText)

    if (!parseResult.success && parseResult.parsedRows === 0) {
      return NextResponse.json({
        error: 'Failed to parse CSV',
        details: parseResult.errors
      }, { status: 400 })
    }

    // Row count guard
    if (parseResult.totalRows > MAX_ROWS) {
      return NextResponse.json({
        error: `File has ${parseResult.totalRows} rows — maximum is ${MAX_ROWS}`
      }, { status: 400 })
    }

    // Create InboundFile record
    const inboundFile = await prisma.inboundFile.create({
      data: {
        franchiseId,
        sourceType: 'UPLOAD',
        filename: file.name,
        fileHash,
        fileSize: file.size,
        parseStatus: 'PARSED',
        totalRows: parseResult.totalRows,
        parsedRows: parseResult.parsedRows,
        errorRows: parseResult.errorRows,
        errors: parseResult.errors.length > 0 ? parseResult.errors : undefined,
        uploadedBy: user.id || user.email || 'unknown',
        completedAt: new Date()
      }
    })

    // Get cost alert threshold from FTP config (or default 10%)
    const ftpConfig = await prisma.ftpConfig.findUnique({ where: { franchiseId } })
    const costAlertPct = ftpConfig ? Number(ftpConfig.costAlertPct) : 10

    // Process each grouped invoice
    const invoiceResults = []

    for (const groupedInvoice of parseResult.invoices) {
      // Find or create supplier
      let supplier = await prisma.supplier.findFirst({
        where: {
          franchiseId,
          OR: [
            { name: groupedInvoice.vendorName },
            { externalVendorCode: groupedInvoice.retailerVendorId || undefined }
          ]
        }
      })

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            franchiseId,
            name: groupedInvoice.vendorName,
            externalVendorCode: groupedInvoice.retailerVendorId || undefined
          }
        })
      }

      // Parse dates safely
      const invoiceDate = parseDate(groupedInvoice.invoiceDate)
      const dueDate = parseDate(groupedInvoice.dueDate)
      const processDate = parseDate(groupedInvoice.processDate)

      // Check for duplicate invoice (idempotency)
      const existingInvoice = await prisma.vendorInvoice.findFirst({
        where: {
          supplierId: supplier.id,
          locationId: locationId || null,
          invoiceNumber: groupedInvoice.invoiceNumber,
          invoiceDate
        }
      })

      if (existingInvoice) {
        invoiceResults.push({
          invoiceNumber: groupedInvoice.invoiceNumber,
          vendor: groupedInvoice.vendorName,
          status: 'SKIPPED',
          reason: 'Duplicate invoice — already exists',
          existingId: existingInvoice.id
        })
        continue
      }

      // Match items
      let matchedCount = 0
      let newCount = 0
      let errorCount = 0
      let costAlertCount = 0
      let parsedTotalAcc = 0

      const itemData = []

      for (let i = 0; i < groupedInvoice.items.length; i++) {
        const item = groupedInvoice.items[i]
        const { baseUnits, perUnitCost } = computeBaseUnits(item)
        parsedTotalAcc += item.extendedPrice

        const matchResult = await matchInvoiceItem(
          prisma, item, franchiseId, supplier.id, costAlertPct
        )

        if (matchResult.matchStatus === 'MATCHED') matchedCount++
        else if (matchResult.matchStatus === 'NEW_PRODUCT' || matchResult.matchStatus === 'SUGGESTED') newCount++
        else errorCount++

        if (matchResult.costChanged) costAlertCount++

        itemData.push({
          lineNumber: i + 1,
          vendorProductNum: item.vendorProductNum || undefined,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitOfMeasure: item.unitOfMeasure || undefined,
          productVolume: item.productVolume || undefined,
          caseUpc: item.caseUpc || undefined,
          cleanUpc: item.cleanUpc || undefined,
          packUpc: item.packUpc || undefined,
          productDesc: item.productDesc,
          productClass: item.productClass || undefined,
          glCode: item.glCode || undefined,
          packsPerCase: item.packsPerCase,
          unitsPerPack: item.unitsPerPack,
          discountAdj: item.discountAdj,
          depositAdj: item.depositAdj,
          miscAdj: item.miscAdj,
          taxAdj: item.taxAdj,
          deliveryAdj: item.deliveryAdj,
          extendedPrice: item.extendedPrice,
          baseUnitsReceived: baseUnits,
          perUnitCost,
          matchStatus: matchResult.matchStatus,
          matchMethod: matchResult.matchMethod || undefined,
          matchedProductId: matchResult.matchedProductId || undefined,
          autoCreatedProductId: matchResult.autoCreatedProductId || undefined,
          suggestedProductIds: matchResult.suggestedProductIds || undefined,
          costChanged: matchResult.costChanged,
          previousCost: matchResult.previousCost,
          costChangePct: matchResult.costChangePct
        })
      }

      // Reconciliation
      const discrepancy = Math.abs(parsedTotalAcc - groupedInvoice.invoiceAmount)
      const discrepancyOk = discrepancy <= 0.05

      // Determine status
      const totalItems = groupedInvoice.items.length
      const matchRate = totalItems > 0 ? (matchedCount / totalItems) * 100 : 0
      let status = 'IMPORTED'
      if (costAlertCount > 0 || newCount > 0 || !discrepancyOk) {
        status = 'REVIEW_REQUIRED'
      } else if (matchedCount === totalItems) {
        status = 'READY_TO_POST'
      }

      // Create invoice + items
      const invoice = await prisma.vendorInvoice.create({
        data: {
          franchiseId,
          locationId: locationId || undefined,
          supplierId: supplier.id,
          inboundFileId: inboundFile.id,
          invoiceNumber: groupedInvoice.invoiceNumber,
          invoiceType: groupedInvoice.invoiceType,
          vendorName: groupedInvoice.vendorName,
          vendorStoreNum: groupedInvoice.vendorStoreNum || undefined,
          retailerStoreNum: groupedInvoice.retailerStoreNum || undefined,
          retailerVendorId: groupedInvoice.retailerVendorId || undefined,
          invoiceDate,
          dueDate,
          processDate,
          totalAmount: groupedInvoice.invoiceAmount,
          itemCount: groupedInvoice.invoiceItemCount,
          poNumber: groupedInvoice.poNumber || undefined,
          poDate: parseDate(groupedInvoice.poDate),
          refInvoiceNumber: groupedInvoice.refInvoiceNumber || undefined,
          status,
          matchRate,
          totalItems,
          matchedItems: matchedCount,
          newItems: newCount,
          errorItems: errorCount,
          costAlertItems: costAlertCount,
          parsedTotal: parsedTotalAcc,
          discrepancy,
          discrepancyOk,
          uploadedBy: user.id || user.email || 'unknown',
          items: {
            create: itemData
          }
        }
      })

      // Update inbound file counts
      await prisma.inboundFile.update({
        where: { id: inboundFile.id },
        data: {
          matchedRows: { increment: matchedCount },
          newProductRows: { increment: newCount },
          errorRows: { increment: errorCount }
        }
      })

      invoiceResults.push({
        invoiceId: invoice.id,
        invoiceNumber: groupedInvoice.invoiceNumber,
        vendor: groupedInvoice.vendorName,
        status,
        totalItems,
        matchedItems: matchedCount,
        newItems: newCount,
        costAlerts: costAlertCount,
        matchRate: `${matchRate.toFixed(1)}%`,
        discrepancy: discrepancyOk ? 'OK' : `$${discrepancy.toFixed(2)} off`
      })
    }

    return NextResponse.json({
      success: true,
      fileId: inboundFile.id,
      filename: file.name,
      totalRows: parseResult.totalRows,
      parsedRows: parseResult.parsedRows,
      parseErrors: parseResult.errorRows,
      invoiceCount: parseResult.invoices.length,
      invoices: invoiceResults
    })

  } catch (error) {
    console.error('Invoice import error:', error)
    return NextResponse.json({
      error: 'Failed to import invoice file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Safely parse a date string, returning now() as fallback
 */
function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr || dateStr.trim() === '') return new Date()
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date() : d
}
