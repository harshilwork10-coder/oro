import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/tobacco-scan/export — Generate export batch
 *   Creates TobaccoScanExportBatch, links UNCLAIMED events, generates file.
 *
 * GET /api/tobacco-scan/export — List export batches
 *
 * Body (POST): { manufacturer, weekStart, weekEnd, storeId? }
 */

// ─── List Export Batches ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const manufacturer = searchParams.get('manufacturer')
    const status = searchParams.get('status')

    const where: any = { franchiseId: user.franchiseId }
    if (manufacturer) where.manufacturer = manufacturer
    if (status) where.status = status

    const batches = await prisma.tobaccoScanExportBatch.findMany({
      where,
      include: {
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('[TOBACCO_EXPORT_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch export batches' }, { status: 500 })
  }
}

// ─── Generate Export Batch ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { manufacturer, weekStart, weekEnd } = body

    if (!manufacturer || !weekStart || !weekEnd) {
      return NextResponse.json({
        error: 'manufacturer, weekStart, and weekEnd required',
      }, { status: 400 })
    }

    if (!['ALTRIA', 'RJR', 'ITG'].includes(manufacturer)) {
      return NextResponse.json({ error: 'Invalid manufacturer' }, { status: 400 })
    }

    const startDate = new Date(weekStart)
    const endDate = new Date(weekEnd)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Find all UNCLAIMED, claim-eligible scan events for this period
    // Either linked to a deal from this manufacturer, or with matching buydown desc
    const unclaimedEvents = await prisma.tobaccoScanEvent.findMany({
      where: {
        claimStatus: 'UNCLAIMED',
        claimEligible: true,
        soldAt: { gte: startDate, lte: endDate },
        OR: [
          { tobaccoDeal: { franchiseId: user.franchiseId, manufacturer } },
          { mfgBuydownDesc: { contains: manufacturer === 'RJR' ? 'RJR' : manufacturer === 'ALTRIA' ? 'Marl' : 'ITG' } },
        ],
      },
      include: {
        tobaccoDeal: true,
        location: true,
      },
      orderBy: { soldAt: 'asc' },
    })

    if (unclaimedEvents.length === 0) {
      return NextResponse.json({
        error: 'No unclaimed scan events found for this manufacturer and period',
      }, { status: 404 })
    }

    // Get store info
    const location = unclaimedEvents[0]?.location
    const mfgConfig = await prisma.manufacturerConfig.findFirst({
      where: { franchiseId: user.franchiseId, manufacturer },
    })

    const outletName = location?.name || 'Store'
    const outletNumber = mfgConfig?.accountNumber || mfgConfig?.storeId || 'PENDING'

    // Parse location address
    const addressParts = (location?.address || '').split(',').map(s => s.trim())
    const address1 = addressParts[0] || ''
    const city = addressParts[1] || ''
    const stateZip = (addressParts[2] || '').split(' ')
    const state = stateZip[0] || ''
    const zip = stateZip[1] || ''

    // Calculate totals
    const totalDiscount = unclaimedEvents.reduce((s, e) => s + Number(e.discountApplied) * e.qty, 0)
    const totalReimbursement = unclaimedEvents.reduce((s, e) => s + Number(e.reimbursementExpected) * e.qty, 0)

    // Generate RMSC 34-field pipe-delimited export lines
    const exportLines = unclaimedEvents.map(event => {
      const txDate = event.soldAt.toISOString()
        .replace('T', '-')
        .replace('Z', '')
        .substring(0, 19) // YYYY-MM-DD-HH:MM:SS

      const fields = [
        outletName,                                          // 1
        outletNumber,                                        // 2
        address1,                                            // 3
        '',                                                  // 4 address2
        city,                                                // 5
        state,                                               // 6
        zip,                                                 // 7
        txDate,                                              // 8
        event.transactionId.substring(0, 12),                // 9
        String(event.lineNumber),                            // 10
        event.stationId || '12345678',                       // 11
        String(event.qty),                                   // 12
        Number(event.sellingPrice).toFixed(2),               // 13
        event.upc,                                           // 14
        event.upcDescription || '',                          // 15
        event.unitOfMeasure.toUpperCase(),                   // 16
        event.promoFlag ? 'Y' : 'N',                         // 17
        event.outletMultipackFlag ? 'Y' : 'N',              // 18
        event.outletMultipackQty ? String(event.outletMultipackQty) : '', // 19
        Number(event.outletMultipackDisc) ? Number(event.outletMultipackDisc).toFixed(2) : '', // 20
        event.acctPromoName || '',                           // 21
        Number(event.acctDiscAmt).toFixed(2),                // 22
        Number(event.mfgDiscAmt).toFixed(2),                 // 23
        event.pidCoupon || '',                               // 24
        Number(event.pidCouponDisc).toFixed(2),              // 25
        event.mfgMultipackFlag ? 'Y' : 'N',                 // 26
        event.mfgMultipackQty ? String(event.mfgMultipackQty) : '', // 27
        Number(event.mfgMultipackDisc) ? Number(event.mfgMultipackDisc).toFixed(2) : '0.00', // 28
        event.mfgPromoDesc || '',                            // 29
        event.mfgBuydownDesc || '',                          // 30
        Number(event.mfgBuydownAmt) ? Number(event.mfgBuydownAmt).toFixed(2) : '0.00', // 31
        event.mfgMultipackDesc || '',                        // 32
        event.loyaltyId || '',                               // 33
        event.offerCode || '',                               // 34
      ]

      return fields.join('|')
    })

    const fileContent = exportLines.join('\n') + '\n'
    const weekStr = startDate.toISOString().split('T')[0].replace(/-/g, '')
    const fileName = `${outletNumber}_${weekStr}_${manufacturer}.txt`

    // Create batch and update events atomically
    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.tobaccoScanExportBatch.create({
        data: {
          franchiseId: user.franchiseId,
          manufacturer,
          weekStart: startDate,
          weekEnd: endDate,
          eventCount: unclaimedEvents.length,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalReimbursement: Math.round(totalReimbursement * 100) / 100,
          status: 'GENERATED',
          exportFileName: fileName,
          exportFormat: 'RMSC_PIPE_34',
        },
      })

      await tx.tobaccoScanEvent.updateMany({
        where: {
          id: { in: unclaimedEvents.map(e => e.id) },
          claimStatus: 'UNCLAIMED',
        },
        data: {
          exportBatchId: newBatch.id,
          claimStatus: 'EXPORTED',
        },
      })

      return newBatch
    })

    return new Response(fileContent, {
      status: 201,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Batch-Id': batch.id,
        'X-Event-Count': String(unclaimedEvents.length),
        'X-Total-Reimbursement': String(Math.round(totalReimbursement * 100) / 100),
        'X-Export-Format': 'RMSC_PIPE_34',
      },
    })
  } catch (error) {
    console.error('[TOBACCO_EXPORT_POST]', error)
    return NextResponse.json({ error: 'Failed to generate export batch' }, { status: 500 })
  }
}

