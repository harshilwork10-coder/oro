import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchInvoiceFiles, testFtpConnection } from '@/lib/ftp-client'
import { parseInvoiceCsv, computeBaseUnits } from '@/lib/fintech-invoice-parser'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { matchInvoiceItem } from '@/lib/invoice-matcher'

/**
 * POST /api/invoices/fetch
 *
 * Actions:
 *   { action: "fetch" }  — Connect to FTP, download new files, parse + match
 *   { action: "test" }   — Test FTP connection only
 *
 * Role: OWNER/ADMIN only
 */
export async function POST(request: Request) {
  try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    const role = (user as { role?: string }).role
    if (!role || !['PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Only PROVIDER can trigger FTP fetch' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    // Get FTP config
    const ftpConfig = await prisma.ftpConfig.findUnique({ where: { franchiseId } })
    if (!ftpConfig) {
      return NextResponse.json({ error: 'FTP not configured. Go to Settings → FTP Config first.' }, { status: 400 })
    }

    // === TEST CONNECTION ===
    if (action === 'test') {
      const result = await testFtpConnection({
        host: ftpConfig.host,
        port: ftpConfig.port,
        protocol: ftpConfig.protocol,
        username: ftpConfig.username,
        password: ftpConfig.password,
        remotePath: ftpConfig.remotePath,
        filePattern: ftpConfig.filePattern
      })
      return NextResponse.json(result)
    }

    // === FETCH + IMPORT ===
    const fetchResult = await fetchInvoiceFiles(
      {
        host: ftpConfig.host,
        port: ftpConfig.port,
        protocol: ftpConfig.protocol,
        username: ftpConfig.username,
        password: ftpConfig.password,
        remotePath: ftpConfig.remotePath,
        filePattern: ftpConfig.filePattern
      },
      prisma,
      franchiseId
    )

    if (!fetchResult.success) {
      return NextResponse.json({
        error: fetchResult.message,
        errors: fetchResult.errors
      }, { status: 502 })
    }

    if (fetchResult.filesDownloaded === 0) {
      // Update lastFetchAt even if no new files
      await prisma.ftpConfig.update({
        where: { franchiseId },
        data: { lastFetchAt: new Date() }
      })

      return NextResponse.json({
        success: true,
        message: `No new files. Found ${fetchResult.filesFound} files, ${fetchResult.filesSkipped} already imported.`,
        filesFound: fetchResult.filesFound,
        filesDownloaded: 0,
        filesSkipped: fetchResult.filesSkipped,
        invoicesCreated: 0
      })
    }

    // Process each downloaded file
    const costAlertPct = Number(ftpConfig.costAlertPct) || 10
    const userId = user.id || user.email || 'system'
    const allInvoiceResults = []
    let totalInvoicesCreated = 0

    for (const file of fetchResult.files) {
      // Create InboundFile record
      const inboundFile = await prisma.inboundFile.create({
        data: {
          franchiseId,
          sourceType: 'FTP',
          filename: file.filename,
          remotePath: file.remotePath,
          fileHash: file.hash,
          fileSize: file.size,
          parseStatus: 'PENDING',
          uploadedBy: userId,
          startedAt: new Date()
        }
      })

      // Parse CSV
      const parseResult = parseInvoiceCsv(file.content)

      if (!parseResult.success && parseResult.parsedRows === 0) {
        await prisma.inboundFile.update({
          where: { id: inboundFile.id },
          data: {
            parseStatus: 'FAILED',
            parseError: parseResult.errors.map(e => e.message).join('; '),
            errors: parseResult.errors,
            completedAt: new Date()
          }
        })
        allInvoiceResults.push({
          file: file.filename,
          status: 'PARSE_FAILED',
          error: parseResult.errors[0]?.message || 'Unknown parse error'
        })
        continue
      }

      // Update inbound file with parse results
      await prisma.inboundFile.update({
        where: { id: inboundFile.id },
        data: {
          parseStatus: 'PARSED',
          totalRows: parseResult.totalRows,
          parsedRows: parseResult.parsedRows,
          errorRows: parseResult.errorRows,
          errors: parseResult.errors.length > 0 ? parseResult.errors : undefined,
          completedAt: new Date()
        }
      })

      // Process each grouped invoice (same logic as import route)
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

        const invoiceDate = safeParseDate(groupedInvoice.invoiceDate)

        // Check for duplicate
        const existingInvoice = await prisma.vendorInvoice.findFirst({
          where: {
            supplierId: supplier.id,
            invoiceNumber: groupedInvoice.invoiceNumber,
            invoiceDate
          }
        })

        if (existingInvoice) {
          allInvoiceResults.push({
            file: file.filename,
            invoiceNumber: groupedInvoice.invoiceNumber,
            vendor: groupedInvoice.vendorName,
            status: 'SKIPPED',
            reason: 'Duplicate invoice'
          })
          continue
        }

        // Match items
        let matchedCount = 0, newCount = 0, errorCount = 0, costAlertCount = 0, parsedTotalAcc = 0
        const itemData = []

        for (let i = 0; i < groupedInvoice.items.length; i++) {
          const item = groupedInvoice.items[i]
          const { baseUnits, perUnitCost } = computeBaseUnits(item)
          parsedTotalAcc += item.extendedPrice

          const matchResult = await matchInvoiceItem(prisma, item, franchiseId, supplier.id, costAlertPct)

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

        const totalItems = groupedInvoice.items.length
        const matchRate = totalItems > 0 ? (matchedCount / totalItems) * 100 : 0
        const discrepancy = Math.abs(parsedTotalAcc - groupedInvoice.invoiceAmount)
        const discrepancyOk = discrepancy <= 0.05
        let status = 'IMPORTED'
        if (costAlertCount > 0 || newCount > 0 || !discrepancyOk) status = 'REVIEW_REQUIRED'
        else if (matchedCount === totalItems) status = 'READY_TO_POST'

        await prisma.vendorInvoice.create({
          data: {
            franchiseId,
            supplierId: supplier.id,
            inboundFileId: inboundFile.id,
            invoiceNumber: groupedInvoice.invoiceNumber,
            invoiceType: groupedInvoice.invoiceType,
            vendorName: groupedInvoice.vendorName,
            vendorStoreNum: groupedInvoice.vendorStoreNum || undefined,
            retailerStoreNum: groupedInvoice.retailerStoreNum || undefined,
            retailerVendorId: groupedInvoice.retailerVendorId || undefined,
            invoiceDate,
            dueDate: safeParseDate(groupedInvoice.dueDate),
            processDate: safeParseDate(groupedInvoice.processDate),
            totalAmount: groupedInvoice.invoiceAmount,
            itemCount: groupedInvoice.invoiceItemCount,
            poNumber: groupedInvoice.poNumber || undefined,
            poDate: safeParseDate(groupedInvoice.poDate),
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
            uploadedBy: userId,
            items: { create: itemData }
          }
        })

        totalInvoicesCreated++

        allInvoiceResults.push({
          file: file.filename,
          invoiceNumber: groupedInvoice.invoiceNumber,
          vendor: groupedInvoice.vendorName,
          status,
          matchRate: `${matchRate.toFixed(1)}%`,
          totalItems,
          matchedItems: matchedCount,
          newItems: newCount,
          costAlerts: costAlertCount
        })
      }

      // Update inbound file counts
      await prisma.inboundFile.update({
        where: { id: inboundFile.id },
        data: {
          matchedRows: allInvoiceResults.filter(r => r.status !== 'PARSE_FAILED').length,
        }
      })
    }

    // Update lastFetchAt
    await prisma.ftpConfig.update({
      where: { franchiseId },
      data: { lastFetchAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: `Fetched ${fetchResult.filesDownloaded} files, created ${totalInvoicesCreated} invoices`,
      filesFound: fetchResult.filesFound,
      filesDownloaded: fetchResult.filesDownloaded,
      filesSkipped: fetchResult.filesSkipped,
      invoicesCreated: totalInvoicesCreated,
      invoices: allInvoiceResults,
      fetchErrors: fetchResult.errors
    })

  } catch (error) {
    console.error('FTP fetch error:', error)
    return NextResponse.json({
      error: 'FTP fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function safeParseDate(dateStr: string | null | undefined): Date {
  if (!dateStr || dateStr.trim() === '') return new Date()
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date() : d
}
