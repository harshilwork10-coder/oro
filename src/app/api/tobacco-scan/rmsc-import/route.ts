/**
 * RMSC Scan Data Import
 *
 * POST /api/tobacco-scan/rmsc-import
 *
 * Accepts multipart/form-data with:
 *   - file: CSV or XLSX (RMSC 34-field format)
 *   - locationId: store location ID
 *   - replaceExisting: "true" to replace previous import of same file (optional)
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import {
    parseCsvContent,
    parseExcelContent,
    computeFileHash,
    type RmscParsedRecord,
} from '@/lib/rmsc-parser'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

        // Parse multipart form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const locationId = formData.get('locationId') as string | null
        const replaceExisting = formData.get('replaceExisting') === 'true'

        // Validation 1: file present
        if (!file) {
            return ApiResponse.badRequest('No file uploaded')
        }

        // Validation 2: extension/type allowed
        const fileName = file.name.toLowerCase()
        const isCsv = fileName.endsWith('.csv')
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
        if (!isCsv && !isExcel) {
            return ApiResponse.badRequest('Only CSV and Excel (.xlsx) files are supported')
        }

        // Resolve location
        let resolvedLocationId = locationId
        if (!resolvedLocationId) {
            const location = await prisma.location.findFirst({
                where: { franchise: { id: user.franchiseId } },
                select: { id: true }
            })
            if (!location) return ApiResponse.badRequest('No location found for franchise')
            resolvedLocationId = location.id
        }

        // Read file into memory (no temp files per Next.js lambda guidelines)
        const arrayBuffer = await file.arrayBuffer()
        const fileHash = computeFileHash(arrayBuffer)

        // Check for duplicate file
        const existingBatch = await prisma.rmscImportBatch.findUnique({
            where: { locationId_fileHash: { locationId: resolvedLocationId, fileHash } }
        })

        if (existingBatch && !replaceExisting) {
            return ApiResponse.badRequest(
                `This file was already imported on ${existingBatch.importedAt.toISOString().split('T')[0]} ` +
                `(batch ${existingBatch.id}, ${existingBatch.importedRows} rows). ` +
                `Set replaceExisting=true to re-import.`
            )
        }

        // If replacing, delete old batch (cascade deletes records)
        if (existingBatch && replaceExisting) {
            await prisma.rmscImportBatch.delete({ where: { id: existingBatch.id } })
        }

        // Parse the file
        let parseResult
        if (isCsv) {
            const text = new TextDecoder('utf-8').decode(arrayBuffer)
            parseResult = parseCsvContent(text)
        } else {
            parseResult = parseExcelContent(arrayBuffer)
        }

        if (parseResult.records.length === 0 && parseResult.errors.length === 0) {
            return ApiResponse.badRequest('No RMSC data found in file. Ensure the file contains RMSC 34-field headers (Outlet Name, UPC Code, etc.)')
        }

        // Deduplicate against existing records in this location
        const existingHashes = new Set(
            (await prisma.rmscScanRecord.findMany({
                where: { locationId: resolvedLocationId },
                select: { rowHash: true }
            })).map(r => r.rowHash)
        )

        const newRecords: RmscParsedRecord[] = []
        let duplicateCount = 0

        for (const record of parseResult.records) {
            if (existingHashes.has(record.rowHash)) {
                duplicateCount++
            } else {
                newRecords.push(record)
                existingHashes.add(record.rowHash) // prevent intra-file dupes
            }
        }

        // Create batch record
        const batch = await prisma.rmscImportBatch.create({
            data: {
                locationId: resolvedLocationId,
                fileName: file.name,
                fileType: isCsv ? 'csv' : 'xlsx',
                fileHash,
                importedById: user.id,
                status: parseResult.errors.length > 0 && newRecords.length > 0
                    ? 'PARTIAL'
                    : parseResult.errors.length > 0
                        ? 'FAILED'
                        : 'COMPLETED',
                totalRows: parseResult.totalRows,
                importedRows: newRecords.length,
                duplicateRows: duplicateCount,
                errorRows: parseResult.errors.length,
                errorSummary: parseResult.errors.length > 0
                    ? parseResult.errors.slice(0, 50) // cap error list
                    : undefined,
            }
        })

        // Insert records in batches of 100
        const BATCH_SIZE = 100
        for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
            const chunk = newRecords.slice(i, i + BATCH_SIZE)
            await prisma.rmscScanRecord.createMany({
                data: chunk.map(r => ({
                    importBatchId: batch.id,
                    locationId: resolvedLocationId!,
                    sourceRowNumber: r.sourceRowNumber,
                    rowHash: r.rowHash,
                    outletNumber: r.outletNumber,
                    transactionDate: r.transactionDate,
                    basketId: r.basketId,
                    scanId: r.scanId,
                    registerNo: r.registerNo,
                    upc: r.upc,
                    productDescription: r.productDescription,
                    quantity: r.quantity,
                    unitPrice: r.unitPrice,
                    extendedPrice: r.extendedPrice,
                    manufacturerCode: r.manufacturerCode,
                    manufacturerName: r.manufacturerName,
                    promoFlag: r.promoFlag,
                    promoType: r.promoType,
                    multipackFlag: r.multipackFlag,
                    buydownAmount: r.buydownAmount,
                    loyaltyFlag: r.loyaltyFlag,
                    rawFields: r.rawFields,
                })),
                skipDuplicates: true,
            })
        }

        return ApiResponse.success({
            batchId: batch.id,
            rowsTotal: parseResult.totalRows,
            rowsImported: newRecords.length,
            rowsDuplicate: duplicateCount,
            rowsErrored: parseResult.errors.length,
            rowsSkippedEmpty: parseResult.skippedEmpty,
            errors: parseResult.errors.slice(0, 50),
        })
    } catch (error) {
        console.error('[RMSC_IMPORT]', error)
        return ApiResponse.error('Failed to import RMSC scan data', 500)
    }
}
